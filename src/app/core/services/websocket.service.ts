/**
 * WebSocket Service - JWT Authenticated Socket.io Connection
 * 
 * Features:
 * - JWT token authentication
 * - Angular Signal-based connection status
 * - Automatic token refresh on expiry
 * - Reconnection with exponential backoff
 */

import { Injectable, Inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private socket: Socket | undefined;
    private mockSubjects: Map<string, Subject<any>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    // ═══════════════════════════════════════════════════════════════
    // STATE - Angular Signals
    // ═══════════════════════════════════════════════════════════════

    /** Current connection status */
    readonly connectionStatus = signal<ConnectionStatus>('disconnected');

    /** Last connection error message */
    readonly connectionError = signal<string | null>(null);

    /** Computed: Is socket connected */
    readonly isConnected = computed(() => this.connectionStatus() === 'connected');

    /** Computed: Is socket reconnecting */
    readonly isReconnecting = computed(() => this.connectionStatus() === 'reconnecting');

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private authService: AuthService
    ) {
        if (isPlatformBrowser(this.platformId)) {
            this.initSocket();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SOCKET INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    private initSocket(): void {
        if (environment.useMockSockets) {
                        this.connectionStatus.set('connected');
            return;
        }

        this.connectSocket();
    }

    private connectSocket(): void {
        const token = this.authService.getToken();

        if (!token) {
            console.warn('[WebSocket] No auth token available, skipping connection');
            this.connectionStatus.set('disconnected');
            return;
        }

        const socketUrl = environment.socketUrl || environment.apiUrl.replace('/api/v1', '');

        this.connectionStatus.set('connecting');
        
        this.socket = io(socketUrl, {
            path: '/socket.io',
            autoConnect: true,
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            auth: {
                token: token
            }
        });

        this.setupEventHandlers();
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════

    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
                        this.reconnectAttempts = 0;
            this.connectionStatus.set('connected');
            this.connectionError.set(null);
        });

        this.socket.on('disconnect', (reason) => {
                        this.connectionStatus.set('disconnected');
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('❌ WebSocket connection error:', error.message);
            this.connectionStatus.set('error');
            this.connectionError.set(error.message);

            if (error.message === 'Token expired' || error.message === 'jwt expired') {
                                this.handleTokenExpiry();
            }
        });

        this.socket.io.on('reconnect_attempt', (attempt) => {
                        this.reconnectAttempts = attempt;
            this.connectionStatus.set('reconnecting');
        });

        this.socket.io.on('reconnect', () => {
                        this.reconnectAttempts = 0;
            this.connectionStatus.set('connected');
            this.connectionError.set(null);
        });

        this.socket.io.on('reconnect_failed', () => {
            console.error('❌ WebSocket reconnection failed after max attempts');
            this.connectionStatus.set('error');
            this.connectionError.set('Connection failed after maximum retry attempts');
        });

        this.socket.on('trip_update', (update: any) => {
        });
        
        this.socket.on('milestone_reached', (data: any) => {
        });

        this.socket.on('route_deviation', (data: any) => {
        });

        this.socket.on('deviation_cleared', (data: any) => {
        });

        this.socket.on('deviation_update', (update: any) => {
                    });

        // Catch-all for diagnostics
        this.socket.onAny((eventName, ...args) => {
                    });
    }

    private async handleTokenExpiry(): Promise<void> {
        try {
            await this.authService.refreshUserData().toPromise();
                        this.reconnect();
        } catch (error) {
            console.error('[WebSocket] Token refresh failed:', error);
            this.connectionError.set('Authentication failed - please login again');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    reconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.connectSocket();
    }

    isSocketConnected(): boolean {
        return this.isConnected();
    }

    emit(eventName: string, data: any): void {
        if (environment.useMockSockets) {
            
            if (!this.mockSubjects.has(eventName)) {
                this.mockSubjects.set(eventName, new Subject<any>());
            }
            this.mockSubjects.get(eventName)?.next(data);
            return;
        }

        if (this.socket && this.isConnected()) {
            this.socket.emit(eventName, data);
        } else {
            console.warn('[WebSocket] Cannot emit - socket not connected');
        }
    }

    joinRoom(roomId: string): void {
        this.emit('joinRoom', { roomId });
    }

    leaveRoom(roomId: string): void {
        this.emit('leaveRoom', { roomId });
    }

    on(eventName: string): Observable<any> {
        if (environment.useMockSockets) {
            if (!this.mockSubjects.has(eventName)) {
                this.mockSubjects.set(eventName, new Subject<any>());
            }
            return this.mockSubjects.get(eventName)!.asObservable();
        }

        return new Observable((observer) => {
            if (!this.socket) {
                return;
            }

            this.socket.on(eventName, (data: any) => {
                observer.next(data);
            });

            return () => {
                this.socket?.off(eventName);
            };
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.connectionStatus.set('disconnected');
        }
    }
}
