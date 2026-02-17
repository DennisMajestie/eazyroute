// src/app/shared/components/navbar/navbar.component.ts
import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EasyrouteOrchestratorService } from '../../../core/services/easyroute-orchestrator.service';
import { environment } from '../../../../environments/environment';

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
}