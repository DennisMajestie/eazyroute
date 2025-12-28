// src/app/shared/components/bottom-nav/bottom-nav.component.ts
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: SafeHtml;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss']
})
export class BottomNavComponent {
  private sanitizer = inject(DomSanitizer);

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  isAuthenticated = computed(() => this.authService.isAuthenticated());
  isAdmin = computed(() => this.authService.isAdmin());

  navItems: NavItem[] = [
    {
      label: 'Home',
      route: '/dashboard',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>`)
    },
    {
      label: 'Explore',
      route: '/routes',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>`)
    },
    {
      label: 'Tag-Along',
      route: '/tag-along',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>`)
    },
    {
      label: 'Bus Stops',
      route: '/bus-stops',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>`)
    },
    {
      label: 'Profile',
      route: '/profile',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>`)
    },
    {
      label: 'Admin',
      route: '/admin',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>`),
      adminOnly: true
    }
  ];

  visibleNavItems = computed(() => {
    return this.navItems.filter(item =>
      !item.adminOnly || this.isAdmin()
    );
  });
}