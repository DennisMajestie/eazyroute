import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SosService } from '../../../core/services/sos.service';
import { GeolocationService } from '../../../core/services/geolocation.service';

/**
 * SosButtonComponent - Emergency Floating Action Button
 * Hold to trigger SOS alert (3 seconds)
 */
@Component({
    selector: 'app-sos-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sos-button.component.html',
    styleUrl: './sos-button.component.scss'
})
export class SosButtonComponent {
    private sos = inject(SosService);
    private geolocation = inject(GeolocationService);

    isPressing = signal(false);
    holdProgress = signal(0);
    isTriggered = signal(false);
    private holdTimer: any;
    private progressInterval: any;

    // Hold duration in milliseconds
    private readonly HOLD_DURATION = 3000;
    private readonly UPDATE_INTERVAL = 50;

    get remainingSeconds(): number {
        return Math.ceil((100 - this.holdProgress()) / 33.33);
    }

    startHold(): void {
        if (this.isTriggered()) return;

        this.isPressing.set(true);
        this.holdProgress.set(0);

        // Update progress every 50ms
        this.progressInterval = setInterval(() => {
            const increment = (this.UPDATE_INTERVAL / this.HOLD_DURATION) * 100;
            const newProgress = Math.min(100, this.holdProgress() + increment);
            this.holdProgress.set(newProgress);

            if (newProgress >= 100) {
                this.triggerSos();
            }
        }, this.UPDATE_INTERVAL);
    }

    endHold(): void {
        this.isPressing.set(false);
        this.holdProgress.set(0);

        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        if (this.holdTimer) {
            clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }
    }

    private triggerSos(): void {
        this.endHold();
        this.isTriggered.set(true);

        // Get current position and send SOS
        this.geolocation.getCurrentPosition().subscribe({
            next: (coords) => {
                this.sos.sendAlert('SOS_SILENT', coords.latitude, coords.longitude).subscribe({
                    next: () => {
                        console.log('[SOS] Alert sent successfully');
                        this.resetAfterDelay();
                    },
                    error: (err) => {
                        console.error('[SOS] Failed to send alert:', err);
                        this.resetAfterDelay();
                    }
                });
            },
            error: () => {
                // Send without location if geolocation fails
                this.sos.sendAlert('SOS_SILENT', 0, 0).subscribe({
                    next: () => this.resetAfterDelay(),
                    error: () => this.resetAfterDelay()
                });
            }
        });
    }

    private resetAfterDelay(): void {
        setTimeout(() => {
            this.isTriggered.set(false);
        }, 5000);
    }
}
