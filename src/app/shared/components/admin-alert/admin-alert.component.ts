import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, AdminNotification } from '../../../core/services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-alert',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-alert.component.html',
  styleUrls: ['./admin-alert.component.scss']
})
export class AdminAlertComponent implements OnInit, OnDestroy {
  private notifService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  activeNotifications: AdminNotification[] = [];

  ngOnInit(): void {
    this.notifService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        this.activeNotifications.push(notif);
        
        // Auto-dismiss after 8 seconds (longer for SOS)
        const duration = notif.severity === 'sos' ? 20000 : 8000;
        setTimeout(() => this.dismiss(notif.id), duration);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  dismiss(id: string): void {
    this.activeNotifications = this.activeNotifications.filter(n => n.id !== id);
  }

  getIcon(severity: string): string {
    switch (severity) {
      case 'sos': return '🚨';
      case 'critical': return '🔥';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  }
}
