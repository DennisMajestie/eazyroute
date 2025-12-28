import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Notification, NotificationType } from '../../../models/notification.model';
import { NotificationHttpService } from '../../../core/services/notification-http.service';

@Component({
    selector: 'app-notification-center',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification-center.component.html',
    styleUrl: './notification-center.component.scss'
})
export class NotificationCenterComponent implements OnInit {
    @Input() isOpen: boolean = false;
    @Output() close = new EventEmitter<void>();

    notifications$: Observable<Notification[]>;
    unreadCount$: Observable<number>;

    constructor(private notificationService: NotificationHttpService) {
        this.notifications$ = this.notificationService.notifications$;
        this.unreadCount$ = this.notificationService.unreadCount$;
    }

    ngOnInit(): void {
        this.notificationService.loadNotifications().subscribe();
    }

    onClose(): void {
        this.close.emit();
    }

    markAsRead(id: string | undefined): void {
        if (id) {
            this.notificationService.markAsRead(id).subscribe();
        }
    }

    markAllAsRead(): void {
        this.notificationService.markAllAsRead().subscribe();
    }

    deleteNotification(id: string | undefined, event: Event): void {
        event.stopPropagation();
        if (id) {
            this.notificationService.deleteNotification(id).subscribe();
        }
    }

    getIcon(type: NotificationType): string {
        switch (type) {
            case 'milestone': return 'stop-circle';
            case 'reroute': return 'refresh-cw';
            case 'trip_completed': return 'check-circle';
            case 'error': return 'alert-circle';
            case 'warning': return 'alert-triangle';
            default: return 'bell';
        }
    }

    getTypeClass(type: NotificationType): string {
        return `type-${type}`;
    }

    formatDate(date: Date | string): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return d.toLocaleDateString();
    }
}
