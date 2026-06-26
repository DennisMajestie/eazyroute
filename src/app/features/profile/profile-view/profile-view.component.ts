/**
 * ═══════════════════════════════════════════════════════════════════
 * PROFILE VIEW COMPONENT - Modern & Beautiful UI
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/features/profile/profile-view.component.ts
 */

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, finalize } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { CommunityService } from '../../../core/services/community.service';
import { ProfileService } from '../../../core/services/profile.service';
import { User, UserReputation } from '../../../models/user.model';

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
  userReputation: UserReputation | null = null;

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

  // Active section
  activeSection: 'overview' | 'trips' | 'settings' | 'security' | 'reputation' = 'overview';

  // Form for editing profile
  editForm!: FormGroup;

  constructor(
    public authService: AuthService,
    public communityService: CommunityService,
    private profileService: ProfileService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.editForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [''],
      phoneNumber: ['']
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadProfileStats();
    this.loadRecentTrips();
    this.loadUserReputation();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * USER PROFILE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   */

  private loadUserProfile(): void {
    // Load initial user from signal
    const user = this.authService.currentUser();
    if (user) {
      this.updateUserFromSignal(user);
    }

    // Refresh from server
    if (this.authService.isUserAuthenticated()) {
      this.authService.getCurrentUser().subscribe({
        next: (user) => this.updateUserFromSignal(user),
        error: (error) => console.error('Error loading profile:', error)
      });
    }
  }

  private updateUserFromSignal(user: User): void {
    this.currentUser = user;
    this.userName = `${user.firstName} ${user.lastName}`.trim();
    this.userEmail = user.email || '';
    this.userPhone = user.phoneNumber || '';
    this.userAvatar = user.avatar || null;
    this.userInitials = this.getInitials(user);

    // Populate edit form
    this.editForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || ''
    });
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

    this.profileService.getProfileStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoadingStats = false;
      },
      error: (err) => {
        console.error('Error loading profile stats:', err);
        this.isLoadingStats = false;
      }
    });
  }

  private loadRecentTrips(): void {
    this.profileService.getRecentTrips().subscribe({
      next: (trips) => {
        this.recentTrips = trips;
      },
      error: (err) => {
        console.error('Error loading recent trips:', err);
        // Fallback to empty array on error
        this.recentTrips = [];
      }
    });
  }

  private loadUserReputation(): void {
    this.profileService.getUserReputation().subscribe({
      next: (reputation) => {
        this.userReputation = reputation;
      },
      error: (err) => {
        console.error('Error loading reputation:', err);
        this.userReputation = null;
      }
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * AVATAR MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   */

  getAvatarFile(event: any): File | null {
    const file = event.target.files[0];
    if (file) {
      const validation = this.profileService.validateAvatarFile(file);
      if (!validation.valid) {
        console.error('Avatar validation failed:', validation.error);
        alert(validation.error);
        return null;
      }
      return file;
    }
    return null;
  }

  onAvatarClick(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.max = '5242880'; // 5MB
    input.onchange = (e: any) => {
      const file = this.getAvatarFile(e);
      if (file) {
        this.uploadAvatar(file);
      }
    };
    input.click();
  }

  uploadAvatar(file: File): void {
    const formData = new FormData();
    formData.append('avatar', file);

    this.profileService.uploadAvatar(formData).subscribe({
      next: (response) => {
        this.userAvatar = response.data?.avatar;
        console.log('Avatar uploaded successfully');
      },
      error: (err) => {
        console.error('Avatar upload failed:', err);
        alert('Failed to upload avatar. Please try again.');
      }
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PROFILE EDITING
   * ═══════════════════════════════════════════════════════════════
   */

  startEditProfile(): void {
    this.isEditingProfile = true;
    if (this.currentUser) {
      this.editForm.patchValue({
        firstName: this.currentUser.firstName || '',
        lastName: this.currentUser.lastName || '',
        email: this.currentUser.email || '',
        phoneNumber: this.currentUser.phoneNumber || ''
      });
    }
  }

  cancelEdit(): void {
    this.isEditingProfile = false;
    this.editForm.reset();
  }

  saveProfile(): void {
    if (this.isSavingProfile) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile = true;

    // Map form to user object for API
    const profileUpdate: Partial<User> = {
      firstName: this.editForm.value.firstName || '',
      lastName: this.editForm.value.lastName || '',
      email: this.editForm.value.email || '',
      phoneNumber: this.editForm.value.phoneNumber || ''
    };

    this.profileService.updateProfile(profileUpdate).subscribe({
      next: (updatedUser) => {
        this.isSavingProfile = false;
        this.isEditingProfile = false;
        // Update current user with new data
        this.updateUserFromSignal(updatedUser);
        this.toastService?.success('Success', 'Profile updated successfully');
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.isSavingProfile = false;
        this.toastService?.error('Error', 'Failed to update profile. Please try again.');
      }
    });
  }

  // Use ToastNotificationService if available
  get toastService() {
    return (window as any).toastNotificationService || {
      success: (title: string, message: string) => console.log(`✅ ${title}: ${message}`),
      error: (title: string, message: string) => console.error(`❌ ${title}: ${message}`)
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * NAVIGATION & ACTIONS
   * ═══════════════════════════════════════════════════════════════
   */

  setActiveSection(section: 'overview' | 'trips' | 'settings' | 'security' | 'reputation'): void {
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