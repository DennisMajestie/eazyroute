import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AdminAlertComponent } from '../../shared/components/admin-alert/admin-alert.component';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';
import { WebSocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminAlertComponent, ToastNotificationComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  public wsService = inject(WebSocketService);

  isSidebarCollapsed = false;
  isSidebarOpen = false;
  currentUrl = '';

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.url;
    });
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  openSidebar(): void {
    this.isSidebarOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
    document.body.style.overflow = '';
  }

  closeSidebarOnMobile(): void {
    // Close sidebar when a nav item is clicked on mobile
    if (window.innerWidth <= 768) {
      this.closeSidebar();
    }
  }

  getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'AD';
    return `${user.firstName?.charAt(0) || 'A'}${user.lastName?.charAt(0) || 'D'}`;
  }

  getPageTitle(): string {
    if (this.currentUrl.includes('/admin/dashboard')) return 'Dashboard Overview';
    if (this.currentUrl.includes('/admin/moderation')) return 'Moderation Queue';
    if (this.currentUrl.includes('/admin/bus-stops')) return 'Bus Stops Management';
    if (this.currentUrl.includes('/admin/routes')) return 'Routes Management';
    if (this.currentUrl.includes('/admin/pricing-rules')) return 'Pricing Rules Management';
    if (this.currentUrl.includes('/admin/users')) return 'Users Management';
    if (this.currentUrl.includes('/admin/safety')) return 'Safety Intelligence';
    if (this.currentUrl.includes('/admin/engine')) return 'Flow Network Engine';
    if (this.currentUrl.includes('/admin/graph')) return 'Graph Diagnostics';
    if (this.currentUrl.includes('/admin/community')) return 'Community Intelligence';
    if (this.currentUrl.includes('/admin/seeder')) return 'Route Seeder';
    if (this.currentUrl.includes('/admin/harvest-registry')) return 'Landmark Harvest Registry';
    return 'Admin Console';
  }
}
