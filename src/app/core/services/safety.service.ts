import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, of } from 'rxjs';
import { switchMap, tap, catchError, filter } from 'rxjs/operators';
import { GeolocationService } from './geolocation.service';
import { AllUrlService } from '../../services/allUrl.service';
import { WebSocketService } from './websocket.service';

export type SafetyLevel = 'yellow' | 'orange' | 'red';

export interface SafetyTip {
    icon: string;
    text: string;
}

@Injectable({
    providedIn: 'root'
})
export class SafetyService {
    private isLiveLocationActive = false;
    private locationInterval$: any;

    // Safety State
    private safetyLevel$ = new BehaviorSubject<SafetyLevel | null>(null);
    public sosAlert$ = new BehaviorSubject<any>(null); // For UI components to consume

    // Audio for Fake Call
    private ringtoneAudio = new Audio('/assets/audio/iphone_ringtone.mp3');

    // Night Mode Tips
    public readonly NIGHT_SAFETY_TIPS: SafetyTip[] = [
        { icon: '🛑', text: "Don't board if the back seat is full of men and the front seat is empty." },
        { icon: '🛑', text: "Don't board if the car has tinted glass or the inner door handles are missing." },
        { icon: '🛡️', text: "Always sit by the door/window, never in the middle." }
    ];

    constructor(
        private http: HttpClient,
        private geolocationService: GeolocationService,
        private urlService: AllUrlService,
        private webSocketService: WebSocketService
    ) {
        this.initSafetyListeners();
    }

    /**
     * Initialize WebSocket Listeners for SOS
     */
    private initSafetyListeners() {
        this.webSocketService.on('sos:broadcast').subscribe((data: any) => {
            console.log('[SafetyService] Received SOS Broadcast:', data);
            this.sosAlert$.next(data);
        });
    }

    /**
     * Check if it is currently Night Mode (8PM - 5AM)
     */
    isNightMode(): boolean {
        const hour = new Date().getHours();
        return hour >= 20 || hour < 5;
    }

    // --- Level 1: Fake Call ---
    triggerFakeCall() {
        // Play ringtone (looping)
        this.ringtoneAudio.loop = true;
        this.ringtoneAudio.play().catch(err => console.error('Audio play failed:', err));

        // Return verification observable (optional)
        return of(true);
    }

    stopFakeCall() {
        this.ringtoneAudio.pause();
        this.ringtoneAudio.currentTime = 0;
    }

    // --- Level 2: Live Location Sharing ---
    startLiveLocationSharing() {
        if (this.isLiveLocationActive) return;

        this.isLiveLocationActive = true;
        console.log('[SafetyService] Live location sharing started');

        // Send updates every 30 seconds
        this.locationInterval$ = interval(30000).pipe(
            switchMap(() => this.geolocationService.getCurrentPosition()),
            switchMap(coords => {
                const payload = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    heading: (coords as any).heading || 0,
                    speed: (coords as any).speed || 0,
                    accuracy: coords.accuracy || 0,
                    timestamp: new Date().toISOString()
                };
                // Use AllUrlService to find endpoint if needed, or hardcode API structure
                // Ideally this endpoint should be in AllUrlService
                return this.http.post('/api/v1/location/update', payload).pipe(
                    catchError(err => of(null)) // Ignore network errors for safety updates
                );
            })
        ).subscribe();
    }

    stopLiveLocationSharing() {
        this.isLiveLocationActive = false;
        if (this.locationInterval$) {
            this.locationInterval$.unsubscribe();
        }
        console.log('[SafetyService] Live location sharing stopped');
    }

    // --- Level 3: SOS Alert ---
    sendSOS(type: 'SOS_SILENT' | 'FAKE_CALL' | 'PANIC_BUTTON' | 'LIVE_SHARE', description?: string): Observable<any> {
        return this.geolocationService.getCurrentPosition().pipe(
            switchMap(coords => {
                const payload = {
                    type,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    description: description || 'User triggered SOS'
                };
                return this.http.post('/api/v1/sos/alert', payload);
            })
        );
    }
}
