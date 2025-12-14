/**
 * ═══════════════════════════════════════════════════════════════════
 * PROFILE VIEW COMPONENT - Modern & Beautiful UI
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/features/profile/profile-view.component.ts
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/user.model';

interface ProfileStats {
  tripsCompleted: number;
  routesSaved: number;
  tagsAlong: number;
  rewardsPoints: number;
}

interface RecentTrip {
  id: string;
  from: string;
  to: string;
  date: string;
  fare: string;
  status: 'completed' | 'cancelled';
}

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile-view.component.html',
  styleUrls: ['./profile-view.component.scss']
})
export class ProfileViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // User data
  currentUser: User | null = null;
  userName = 'Guest';
  userEmail = '';
  userPhone = '';
  userAvatar: string | null = null;
  userInitials = 'G';

  // Profile stats
  stats: ProfileStats = {
    tripsCompleted: 0,
    routesSaved: 0,
    tagsAlong: 0,
    rewardsPoints: 0
  };

  // Recent trips
  recentTrips: RecentTrip[] = [];

  // UI states
  isEditingProfile = false;
  isLoadingStats = false;
  isSavingProfile = false;
  showLogoutModal = false;

  // Edit form
  editForm = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  };

  // Active section
  activeSection: 'overview' | 'trips' | 'settings' | 'security' = 'overview';

  constructor(
    public authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadProfileStats();
    this.loadRecentTrips();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * USER PROFILE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   */

  private loadUserProfile(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUser = user;
          this.userName = `${user.firstName} ${user.lastName}`.trim();
          this.userEmail = user.email || '';
          this.userPhone = user.phoneNumber || '';
          this.userAvatar = user.avatar || null;
          this.userInitials = this.getInitials(user);

          // Populate edit form
          this.editForm = {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || ''
          };
        }
      });

    // Refresh from server
    if (this.authService.isUserAuthenticated()) {
      this.authService.getCurrentUser().subscribe({
        error: (error) => console.error('Error loading profile:', error)
      });
    }
  }

  private getInitials(user: User): string {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PROFILE STATS & DATA
   * ═══════════════════════════════════════════════════════════════
   */

  private loadProfileStats(): void {
    this.isLoadingStats = true;

    // TODO: Load from API
    setTimeout(() => {
      this.stats = {
        tripsCompleted: 47,
        routesSaved: 12,
        tagsAlong: 8,
        rewardsPoints: 350
      };
      this.isLoadingStats = false;
    }, 500);
  }

  private loadRecentTrips(): void {
    // TODO: Load from API
    this.recentTrips = [
      {
        id: '1',
        from: 'Kubwa',
        to: 'Berger',
        date: '2 hours ago',
        fare: '₦300',
        status: 'completed'
      },
      {
        id: '2',
        from: 'Wuse 2',
        to: 'Nyanya',
        date: 'Yesterday',
        fare: '₦400',
        status: 'completed'
      },
      {
        id: '3',
        from: 'Gwarinpa',
        to: 'Area 1',
        date: '2 days ago',
        fare: '₦350',
        status: 'completed'
      }
    ];
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PROFILE EDITING
   * ═══════════════════════════════════════════════════════════════
   */

  startEditProfile(): void {
    this.isEditingProfile = true;
  }

  cancelEdit(): void {
    this.isEditingProfile = false;
    // Reset form
    if (this.currentUser) {
      this.editForm = {
        firstName: this.currentUser.firstName || '',
        lastName: this.currentUser.lastName || '',
        email: this.currentUser.email || '',
        phoneNumber: this.currentUser.phoneNumber || ''
      };
    }
  }

  saveProfile(): void {
    if (this.isSavingProfile) return;

    this.isSavingProfile = true;

    this.authService.updateProfile(this.editForm).subscribe({
      next: (response) => {
        console.log('Profile updated successfully');
        this.isSavingProfile = false;
        this.isEditingProfile = false;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.isSavingProfile = false;
        alert('Failed to update profile. Please try again.');
      }
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * AVATAR MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   */

  onAvatarClick(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadAvatar(file);
      }
    };
    input.click();
  }

  uploadAvatar(file: File): void {
    // TODO: Upload to backend
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.userAvatar = e.target.result;
      // Update in backend
      this.authService.updateProfile({ avatar: e.target.result } as any).subscribe({
        next: () => console.log('Avatar updated'),
        error: (err) => console.error('Avatar upload failed:', err)
      });
    };
    reader.readAsDataURL(file);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * NAVIGATION & ACTIONS
   * ═══════════════════════════════════════════════════════════════
   */

  setActiveSection(section: 'overview' | 'trips' | 'settings' | 'security'): void {
    this.activeSection = section;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  showLogout(): void {
    this.showLogoutModal = true;
  }

  cancelLogout(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.showLogoutModal = false;
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.router.navigate(['/auth/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}