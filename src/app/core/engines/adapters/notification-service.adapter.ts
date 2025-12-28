// ═══════════════════════════════════════════════════════════════════
// FILE 5: Notification Service Implementation
// Location: src/app/core/engines/adapters/notification-service.adapter.ts
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { INotificationService, TripMilestone, TripSummary } from '../types/easyroute.types';
import { ToastNotificationService } from '../../services/toast-notification.service';

@Injectable({
    providedIn: 'root'
})
export class NotificationServiceAdapter implements INotificationService {
    constructor(private toastService: ToastNotificationService) { }

    async sendMilestoneNotification(userId: string, milestone: TripMilestone): Promise<void> {
        this.toastService.success(
            'Milestone Reached',
            `You have arrived at ${milestone.stopName}`
        );

        // Trigger browser notification...
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Milestone Reached', {
                body: `Approaching ${milestone.stopName}`,
                icon: '/assets/icons/bus-icon.png'
            });
        }

        // You can also integrate with:
        // - Push notification service (Firebase Cloud Messaging)
        // - In-app toast notifications
        // - WebSocket for real-time updates
    }

    async sendRerouteNotification(userId: string, reason: string): Promise<void> {
        this.toastService.warning('Route Updated', reason);

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Route Updated', {
                body: reason,
                icon: '/assets/icons/warning-icon.png'
            });
        }
    }

    async sendTripCompletedNotification(userId: string, summary: TripSummary): Promise<void> {
        this.toastService.success(
            'Trip Completed!',
            `Duration: ${summary.actualDuration} min | Cost: ₦${summary.actualCost}`
        );

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Trip Completed!', {
                body: `Duration: ${summary.actualDuration} min | Cost: ₦${summary.actualCost}`,
                icon: '/assets/icons/success-icon.png'
            });
        }
    }

    async triggerVibration(pattern: number[] = [200, 100, 200]): Promise<void> {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    async showInAppAlert(title: string, message: string): Promise<void> {
        this.toastService.info(title, message);
    }

    /**
     * Request notification permission
     */
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
}