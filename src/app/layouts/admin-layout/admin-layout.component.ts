import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  isSidebarCollapsed = false;
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

  getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'AD';
    return `${user.firstName?.charAt(0) || 'A'}${user.lastName?.charAt(0) || 'D'}`;
  }

  getPageTitle(): string {
    if (this.currentUrl.includes('/admin/dashboard')) return 'Dashboard Overview';
    if (this.currentUrl.includes('/admin/graph')) return 'Graph Diagnostics';
    if (this.currentUrl.includes('/admin/moderation')) return 'Moderation Queue';
    return 'Admin Console';
  }
}
