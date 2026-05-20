// src/app/core/engines/adapters/notification-http.adapter.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { INotificationService, TripMilestone, TripSummary } from '../types/easyroute.types';
import { AllUrlService } from '../../../services/allUrl.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationHttpAdapter implements INotificationService {
  private urls: any;
  private notificationPermission: NotificationPermission = 'default';

  constructor(
    private http: HttpClient,
    private urlService: AllUrlService
  ) {
    this.urls = this.urlService.getAllUrls();
    this.checkNotificationPermission();
  }

  /**
   * Check current notification permission
   */
  private checkNotificationPermission(): void {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  /**
   * Send milestone notification
   */
  async sendMilestoneNotification(userId: string, milestone: TripMilestone): Promise<void> {
    
    // Send to backend (for push notifications, logging, etc.)
    try {
      await firstValueFrom(
        this.http.post(this.urls.notifications.getAll, {
          type: 'milestone',
          userId,
          data: {
            stopName: milestone.stopName,
            expectedTime: milestone.expectedArrivalTime
          }
        })
      );
    } catch (error) {
      console.error('[NotificationAdapter] Error sending milestone to backend:', error);
    }

    // Show browser notification
    if (this.notificationPermission === 'granted') {
      new Notification('Milestone Reached! 🚏', {
        body: `Approaching ${milestone.stopName}`,
        icon: '/assets/icons/bus-icon.png',
        badge: '/assets/icons/badge.png',
        tag: `milestone-${milestone.stopId}`,
        requireInteraction: false
      });
    }

    // Trigger vibration
    await this.triggerVibration([200, 100, 200]);
  }

  /**
   * Send reroute notification
   */
  async sendRerouteNotification(userId: string, reason: string): Promise<void> {
    
    // Send to backend
    try {
      await firstValueFrom(
        this.http.post(this.urls.notifications.getAll, {
          type: 'reroute',
          userId,
          data: { reason }
        })
      );
    } catch (error) {
      console.error('[NotificationAdapter] Error sending reroute to backend:', error);
    }

    // Show browser notification
    if (this.notificationPermission === 'granted') {
      new Notification('Route Updated! 🔄', {
        body: reason,
        icon: '/assets/icons/warning-icon.png',
        badge: '/assets/icons/badge.png',
        tag: 'reroute',
        requireInteraction: true
      });
    }

    // Trigger stronger vibration
    await this.triggerVibration([300, 100, 300, 100, 300]);
  }

  /**
   * Send trip completed notification
   */
  async sendTripCompletedNotification(userId: string, summary: TripSummary): Promise<void> {
    
    // Send to backend
    try {
      await firstValueFrom(
        this.http.post(this.urls.notifications.getAll, {
          type: 'trip_completed',
          userId,
          data: summary
        })
      );
    } catch (error) {
      console.error('[NotificationAdapter] Error sending completion to backend:', error);
    }

    // Show browser notification
    if (this.notificationPermission === 'granted') {
      const costText = summary.actualCost ? `₦${summary.actualCost}` : 'N/A';
      new Notification('Trip Completed! 🎉', {
        body: `Duration: ${summary.actualDuration} min | Cost: ${costText}`,
        icon: '/assets/icons/success-icon.png',
        badge: '/assets/icons/badge.png',
        tag: 'trip-completed',
        requireInteraction: false
      });
    }

    // Trigger success vibration
    await this.triggerVibration([100, 50, 100, 50, 100]);
  }

  /**
   * Trigger device vibration
   */
  async triggerVibration(pattern: number[] = [200, 100, 200]): Promise<void> {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn('[NotificationAdapter] Vibration failed:', error);
      }
    }
  }

  /**
   * Show in-app alert
   */
  async showInAppAlert(title: string, message: string): Promise<void> {
    
    // You can integrate with Angular Material Snackbar or custom toast service
    // For now, using native alert as fallback

    // Option 1: Native alert (simple)
    // alert(`${title}\n\n${message}`);

    // Option 2: Console log (for development)
    console.info(`📢 ${title}: ${message}`);

    // TODO: Replace with your toast/snackbar service
    // this.toastService.show(title, message);
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[NotificationAdapter] Notifications not supported');
      return false;
    }

    if (this.notificationPermission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('[NotificationAdapter] Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Register device for push notifications
   */
  async registerDevice(deviceToken: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(this.urls.notifications.registerDevice, {
          deviceToken,
          platform: this.getPlatform()
        })
      );
          } catch (error) {
      console.error('[NotificationAdapter] Error registering device:', error);
    }
  }

  /**
   * Unregister device from push notifications
   */
  async unregisterDevice(deviceToken: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(this.urls.notifications.unregisterDevice, {
          deviceToken
        })
      );
          } catch (error) {
      console.error('[NotificationAdapter] Error unregistering device:', error);
    }
  }

  /**
   * Get current platform
   */
  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    return 'web';
  }
}