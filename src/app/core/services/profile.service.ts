/**
 * Profile Service - User Profile API Service
 * Handles all user profile related API calls
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../../models/user.model';
import { UserReputation } from '../../models/user.model';

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

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/user`;

  constructor(private http: HttpClient) { }

  // ═══════════════════════════════════════════════════════════════
  // USER PROFILE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current user's profile
   */
  getProfile(): Observable<User> {
    return this.http.get<{ success: boolean; data: User }>(`${this.apiUrl}/profile`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Update user profile
   */
  updateProfile(profile: Partial<User>): Observable<User> {
    return this.http.patch<{ success: boolean; data: User }>(`${this.apiUrl}/profile`, profile).pipe(
      map(response => response.data)
    );
  }

  /**
   * Upload user avatar
   */
  uploadAvatar(formData: FormData): Observable<{ success: boolean; data: { avatar: string } }> {
    return this.http.post<{ success: boolean; data: { avatar: string } }>(`${this.apiUrl}/avatar/upload`, formData);
  }

  // ═══════════════════════════════════════════════════════════════
  // USER STATS & ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get user profile statistics
   */
  getProfileStats(): Observable<ProfileStats> {
    return this.http.get<{ success: boolean; data: ProfileStats }>(`${this.apiUrl}/stats`).pipe(
      map(response => response.data || {
        tripsCompleted: 0,
        routesSaved: 0,
        tagsAlong: 0,
        rewardsPoints: 0
      })
    );
  }

  /**
   * Get user's recent trips
   */
  getRecentTrips(limit: number = 5): Observable<RecentTrip[]> {
    return this.http.get<{ success: boolean; data: RecentTrip[] }>(`${this.apiUrl}/trips?limit=${limit}`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get user reputation and tier information
   */
  getUserReputation(): Observable<UserReputation> {
    return this.http.get<{ success: boolean; data: UserReputation }>(`${this.apiUrl}/reputation`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get user's activity metrics
   */
  getActivityMetrics(): Observable<any> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/activity/metrics`).pipe(
      map(response => response.data)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // AVATAR MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate image file for upload
   */
  validateAvatarFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Please upload a JPEG, PNG, GIF, or WebP image' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Image size must be less than 5MB' };
    }

    return { valid: true };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// ═══════════════════════════════════════════════════════════════
// BACKEND TYPE DEFINITIONS (if needed)
// ═══════════════════════════════════════════════════════════════

// Backend may return additional fields, extend as needed
interface UserWithMetadata extends User {
    reputationScore?: number;
    tier?: string;
    stats?: ProfileStats;
    recentTrips?: RecentTrip[];
    joinDate?: string;
    lastActive?: string;
}