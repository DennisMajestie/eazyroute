import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { AllUrlService } from '../../services/allUrl.service';
import { Notification, NotificationResponse } from '../../models/notification.model';

@Injectable({
    providedIn: 'root'
})
export class NotificationHttpService {
    private urls: any;
    private notificationsSubject = new BehaviorSubject<Notification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    private unreadCountSubject = new BehaviorSubject<number>(0);
    public unreadCount$ = this.unreadCountSubject.asObservable();

    constructor(
        private http: HttpClient,
        private urlService: AllUrlService
    ) {
        this.urls = this.urlService.getAllUrls().notifications;
    }

    /**
     * Fetch all notifications from backend
     */
    loadNotifications(): Observable<NotificationResponse> {
        return this.http.get<NotificationResponse>(this.urls.getAll).pipe(
            tap(response => {
                if (response.success && response.data) {
                    this.notificationsSubject.next(response.data);
                    this.updateUnreadCount(response.data);
                }
            }),
            catchError(error => {
                console.error('[NotificationHttpService] Error loading notifications:', error);
                return of({ success: false, data: [] } as NotificationResponse);
            })
        );
    }

    /**
     * Mark a notification as read
     */
    markAsRead(notificationId: string): Observable<any> {
        const url = `${this.urls.markAsRead}${notificationId}/read`;
        return this.http.patch(url, {}).pipe(
            tap(() => {
                const current = Array.isArray(this.notificationsSubject.value) ? this.notificationsSubject.value : [];
                const updated = current.map(n =>
                    (n._id === notificationId || n.id === notificationId) ? { ...n, isRead: true } : n
                );
                this.notificationsSubject.next(updated);
                this.updateUnreadCount(updated);
            })
        );
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead(): Observable<any> {
        return this.http.post(this.urls.markAllAsRead, {}).pipe(
            tap(() => {
                const current = Array.isArray(this.notificationsSubject.value) ? this.notificationsSubject.value : [];
                const updated = current.map(n => ({ ...n, isRead: true }));
                this.notificationsSubject.next(updated);
                this.unreadCountSubject.next(0);
            })
        );
    }

    /**
     * Delete a notification
     */
    deleteNotification(notificationId: string): Observable<any> {
        const url = `${this.urls.delete}${notificationId}`;
        return this.http.delete(url).pipe(
            tap(() => {
                const updated = this.notificationsSubject.value.filter(n =>
                    n._id !== notificationId && n.id !== notificationId
                );
                this.notificationsSubject.next(updated);
                this.updateUnreadCount(updated);
            })
        );
    }

    private updateUnreadCount(notifications: Notification[]): void {
        const count = notifications.filter(n => !n.isRead).length;
        this.unreadCountSubject.next(count);
    }
}
