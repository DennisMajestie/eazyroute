import { Injectable, signal, computed } from '@angular/core';

/**
 * NightModeService - Angular Signals-based Night Mode Detection
 * Uses reactive signals for automatic updates
 */
@Injectable({ providedIn: 'root' })
export class NightModeService {
    private currentHour = signal(new Date().getHours());

    /**
     * Computed signal: true if current time is between 8PM and 5AM
     */
    isNightMode = computed(() => {
        const hour = this.currentHour();
        return hour >= 20 || hour < 5;
    });

    /**
     * Night-time safety tips for Nigerian commuters
     */
    readonly SAFETY_TIPS: string[] = [
        "🛑 Don't board if the back seat is full of men and the front seat is empty.",
        "🛑 Don't board if the car has tinted glass or missing inner door handles.",
        "🛡️ Always sit by the door/window, never in the middle.",
        "📱 Share your live location with a trusted contact.",
        "🚗 Note the plate number and share it with someone.",
        "⚠️ Trust your instincts - if something feels wrong, don't board.",
        "📍 Know your route and don't let the driver deviate.",
        "🔦 Keep your phone charged and have emergency numbers ready."
    ];

    constructor() {
        // Update the hour signal every minute
        setInterval(() => {
            this.currentHour.set(new Date().getHours());
        }, 60000);
    }

    /**
     * Get safety tips for display
     */
    getSafetyTips(): string[] {
        return this.SAFETY_TIPS;
    }

    /**
     * Get a random safety tip
     */
    getRandomTip(): string {
        const index = Math.floor(Math.random() * this.SAFETY_TIPS.length);
        return this.SAFETY_TIPS[index];
    }

    /**
     * Get current hour (for testing/debugging)
     */
    getCurrentHour(): number {
        return this.currentHour();
    }
}
