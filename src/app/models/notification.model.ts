export type NotificationType = 'milestone' | 'reroute' | 'trip_completed' | 'system' | 'info' | 'warning' | 'error';

export interface Notification {
    _id?: string;
    id?: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date | string;
    isRead: boolean;
    data?: any;
}

export interface NotificationResponse {
    success: boolean;
    data: Notification[];
    total?: number;
}
