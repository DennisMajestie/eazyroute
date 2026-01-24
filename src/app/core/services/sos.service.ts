import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SafetyService } from './safety.service';

export type SosAlertType = 'SOS_SILENT' | 'FAKE_CALL' | 'PANIC_BUTTON' | 'LIVE_SHARE';

/**
 * SosService - Simplified SOS Alert Service
 * Wraps SafetyService for component injection
 */
@Injectable({ providedIn: 'root' })
export class SosService {
    private safety = inject(SafetyService);

    /**
     * Send SOS alert with current location
     */
    sendAlert(type: SosAlertType, lat: number, lng: number, description?: string): Observable<any> {
        return this.safety.sendSOS(type, description);
    }

    /**
     * Trigger fake call (Level 1 safety)
     */
    triggerFakeCall(): void {
        this.safety.triggerFakeCall();
    }

    /**
     * Stop fake call
     */
    stopFakeCall(): void {
        this.safety.stopFakeCall();
    }

    /**
     * Start live location sharing (Level 2 safety)
     */
    startLiveLocationSharing(): void {
        this.safety.startLiveLocationSharing();
    }

    /**
     * Stop live location sharing
     */
    stopLiveLocationSharing(): void {
        this.safety.stopLiveLocationSharing();
    }

    /**
     * Get SOS alerts observable
     */
    getSosAlerts(): Observable<any> {
        return this.safety.sosAlert$.asObservable();
    }

    /**
     * Check if night mode is active
     */
    isNightMode(): boolean {
        return this.safety.isNightMode();
    }
}
