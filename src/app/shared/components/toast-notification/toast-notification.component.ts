import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastNotificationService, ToastNotification } from '../../../core/services/toast-notification.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-toast-notification',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './toast-notification.component.html',
    styleUrl: './toast-notification.component.scss'
})
export class ToastNotificationComponent implements OnInit {
    notifications$: Observable<ToastNotification[]>;

    constructor(private toastService: ToastNotificationService) {
        this.notifications$ = this.toastService.notifications$;
    }

    ngOnInit(): void { }

    remove(id: string): void {
        this.toastService.remove(id);
    }

    getIcon(type: string): string {
        switch (type) {
            case 'success': return 'check-circle';
            case 'warning': return 'alert-triangle';
            case 'error': return 'alert-circle';
            default: return 'info';
        }
    }
}
