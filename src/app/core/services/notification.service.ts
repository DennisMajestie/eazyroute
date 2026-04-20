import { Injectable, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { WebSocketService } from './websocket.service';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'critical' | 'sos';

export interface AdminNotification {
    id: string;
    title: string;
    message: string;
    severity: AlertSeverity;
    timestamp: Date;
    actionLink?: string;
    data?: any;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private wsService = inject(WebSocketService);
    
    private notificationSubject = new Subject<AdminNotification>();
    public notifications$ = this.notificationSubject.asObservable();

    constructor() {
        this.initSocketWatchers();
    }

    private initSocketWatchers(): void {
        // 1. Listen for SOS Broadcasts
        this.wsService.on('sos:broadcast').subscribe(data => {
            this.notify({
                id: `sos-${Date.now()}`,
                title: 'CRITICAL: SOS ALERT',
                message: data.description || 'A user has triggered an SOS panic alert.',
                severity: 'sos',
                timestamp: new Date(),
                actionLink: '/admin/safety',
                data
            });
        });

        // 2. Listen for New Moderation Items
        this.wsService.on('moderation:new').subscribe(data => {
            this.notify({
                id: `mod-${Date.now()}`,
                title: 'New Moderation Request',
                message: `New ${data.type} submission from ${data.submittedBy}.`,
                severity: 'info',
                timestamp: new Date(),
                actionLink: '/admin/moderation',
                data
            });
        });

        // 3. Listen for Critical Traffic/Congestion
        this.wsService.on('congestion:critical').subscribe(data => {
            this.notify({
                id: `cong-${Date.now()}`,
                title: 'Traffic Gridlock Detected',
                message: `Critical congestion at ${data.location}. Impact: ${data.impact}% delay.`,
                severity: 'warning',
                timestamp: new Date(),
                actionLink: '/admin/community',
                data
            });
        });

        // 4. Listen for User Intel / Community Reports
        this.wsService.on('community:report:new').subscribe(data => {
            const reportType = (data.type || 'Intel').replace('_', ' ');
            const capitalizedType = reportType.charAt(0).toUpperCase() + reportType.slice(1);
            
            this.notify({
                id: `comm-${Date.now()}`,
                title: `New Community ${capitalizedType}`,
                message: `Incoming ${reportType} report for ${data.mode || 'transit'}.`,
                severity: 'success',
                timestamp: new Date(),
                actionLink: '/admin/community',
                data
            });
        });
    }

    /**
     * Show a generic notification (can be called manually from components)
     */
    notify(notif: AdminNotification): void {
        this.notificationSubject.next(notif);
        
        // Log to console for debugging
        console.log(`[Admin Notification] ${notif.severity.toUpperCase()}: ${notif.title} - ${notif.message}`);
    }

    /**
     * Special helper for Success alerts
     */
    success(title: string, message: string): void {
        this.notify({
            id: `success-${Date.now()}`,
            title,
            message,
            severity: 'success',
            timestamp: new Date()
        });
    }

    /**
     * Special helper for Warning alerts
     */
    warn(title: string, message: string): void {
        this.notify({
            id: `warn-${Date.now()}`,
            title,
            message,
            severity: 'warning',
            timestamp: new Date()
        });
    }
}
