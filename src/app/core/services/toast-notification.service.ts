import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastNotificationService {
    private notificationsSubject = new BehaviorSubject<ToastNotification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    constructor() { }

    /**
     * Show a new toast notification
     */
    show(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 5000): void {
        const id = Math.random().toString(36).substring(2, 9);
        const newNotification: ToastNotification = { id, title, message, type, duration };

        const current = this.notificationsSubject.value;
        this.notificationsSubject.next([...current, newNotification]);

        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
    }

    /**
     * Convenience methods
     */
    success(title: string, message: string, duration?: number): void {
        this.show(title, message, 'success', duration);
    }

    info(title: string, message: string, duration?: number): void {
        this.show(title, message, 'info', duration);
    }

    warning(title: string, message: string, duration?: number): void {
        this.show(title, message, 'warning', duration);
    }

    error(title: string, message: string, duration?: number): void {
        this.show(title, message, 'error', duration);
    }

    /**
     * Remove a notification by ID
     */
    remove(id: string): void {
        const filtered = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(filtered);
    }
}
