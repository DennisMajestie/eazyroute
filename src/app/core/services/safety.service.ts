import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, of } from 'rxjs';
import { switchMap, tap, catchError, filter } from 'rxjs/operators';
import { GeolocationService } from './geolocation.service';
import { AllUrlService } from '../../services/allUrl.service';

export type SafetyLevel = 'yellow' | 'orange' | 'red';

@Injectable({
    providedIn: 'root'
})
export class SafetyService {
    private isLiveLocationActive = false;
    private locationInterval$: any;

    // Safety State
    private safetyLevel$ = new BehaviorSubject<SafetyLevel | null>(null);

    // Audio for Fake Call
    private ringtoneAudio = new Audio('/assets/audio/iphone_ringtone.mp3');

    constructor(
        private http: HttpClient,
        private geolocationService: GeolocationService,
        private urlService: AllUrlService
    ) { }

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
