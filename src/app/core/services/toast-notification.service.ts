import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastNotificationAction {
    label: string;
    callback: () => void;
}

export interface ToastNotification {
    id: string;
    key?: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
    action?: ToastNotificationAction;
    vibrate?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ToastNotificationService {
    private notificationsSubject = new BehaviorSubject<ToastNotification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    constructor() { }

    /**
     * Show a new toast notification.
     * If a toast with the same key already exists, do not duplicate it.
     */
    show(
        title: string,
        message: string,
        type: 'info' | 'success' | 'warning' | 'error' = 'info',
        duration: number = 5000,
        options?: { action?: ToastNotificationAction, vibrate?: boolean, key?: string }
    ): void {
        const current = this.notificationsSubject.value;
        const key = options?.key;

        if (key && current.some(n => n.key === key)) {
            return;
        }

        const duplicate = current.find(n =>
            !key && n.title === title && n.message === message && n.type === type
        );

        if (duplicate) {
            return;
        }

        const id = key ?? Math.random().toString(36).substring(2, 9);
        const newNotification: ToastNotification = {
            id,
            key,
            title,
            message,
            type,
            duration,
            action: options?.action,
            vibrate: options?.vibrate
        };

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

    error(title: string, message: string, duration?: number, options?: { action?: ToastNotificationAction, vibrate?: boolean }): void {
        this.show(title, message, 'error', duration, options);
    }

    /**
     * Remove a notification by ID
     */
    remove(id: string): void {
        const filtered = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(filtered);
    }
}
