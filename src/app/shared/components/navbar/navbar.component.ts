// src/app/shared/components/navbar/navbar.component.ts
import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EasyrouteOrchestratorService } from '../../../core/services/easyroute-orchestrator.service';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  appName = environment.appName;
  showUserMenu = false;
  showMobileMenu = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private orchestrator: EasyrouteOrchestratorService
  ) { }

  // Computed signals from AuthService - defined after constructor
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  currentUser = computed(() => this.authService.currentUser());
  isAdmin = computed(() => this.authService.isAdmin());

  // Computed values with proper null checks
  userName = computed(() => {
    const user = this.currentUser();
    if (!user || !user.firstName || !user.lastName) return 'Guest';
    return `${user.firstName} ${user.lastName}`;
  });

  userInitials = computed(() => {
    const user = this.currentUser();
    if (!user || !user.firstName || !user.lastName) return 'G';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  });

  navigateHome(): void {
    this.router.navigate([this.isAuthenticated() ? '/dashboard' : '/']);
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout().subscribe();
  }

  showComingSoon(feature: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    Swal.fire({
      title: 'Coming Soon! 🚀',
      html: `
        <div style="font-family: 'Inter', sans-serif; text-align: center; padding: 10px;">
          <p style="font-size: 1.1rem; color: #374151; margin-bottom: 1.5rem; line-height: 1.6;">
            We are working hard to build the <strong>${feature}</strong> feature for you. 
            Make we join hands build this platform together! 🇳🇬
          </p>
          <div style="font-size: 3rem; margin-bottom: 1.5rem;">🛠️</div>
          <p style="font-size: 0.9rem; color: #6B7280; font-style: italic;">
            Stay tuned - EazyRoute dey come active with more hubs soon!
          </p>
        </div>
      `,
      confirmButtonText: 'Correct! 👍',
      confirmButtonColor: '#008751',
      customClass: {
        confirmButton: 'btn btn-primary px-4 py-2'
      }
    });
  }
}