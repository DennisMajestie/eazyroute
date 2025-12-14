
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private socket: Socket | undefined;
    private isConnected = false;
    private mockSubjects: Map<string, Subject<any>> = new Map();

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        if (isPlatformBrowser(this.platformId)) {
            this.initSocket();
        }
    }

    private initSocket(): void {
        if (environment.useMockSockets) {
            console.log(' Using Mock WebSockets');
            this.isConnected = true;
            return;
        }

        // Assuming API URL base for socket, or separate config
        // Usually socket.io connects to the base URL or specified path
        const url = environment.apiUrl.replace('/api/v1', ''); // simple heuristic

        this.socket = io(url, {
            path: '/socket.io',
            autoConnect: true,
            transports: ['polling', 'websocket'], // Try polling first, then upgrade
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.isConnected = true;
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('WebSocket connection error:', error);
        });
    }

    // Emit event
    emit(eventName: string, data: any): void {
        if (environment.useMockSockets) {
            console.log(`[Mock WS] Emitting: ${eventName}`, data);

            // If we are emitting 'joinRoom', we might want to simulate a response or just log it
            // This acts as a simple event bus for now
            if (!this.mockSubjects.has(eventName)) {
                this.mockSubjects.set(eventName, new Subject<any>());
            }
            this.mockSubjects.get(eventName)?.next(data);
            return;
        }

        if (this.socket && this.isConnected) {
            this.socket.emit(eventName, data);
        }
    }

    // Listen to event
    on(eventName: string): Observable<any> {
        if (environment.useMockSockets) {
            if (!this.mockSubjects.has(eventName)) {
                this.mockSubjects.set(eventName, new Subject<any>());
            }
            return this.mockSubjects.get(eventName)!.asObservable();
        }

        return new Observable((observer) => {
            if (!this.socket) {
                // If not browser or not init, complete immediately or error?
                // Just return empty for SSR safety
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
        }
    }
}
