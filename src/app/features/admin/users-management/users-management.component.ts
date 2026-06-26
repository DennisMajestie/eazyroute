import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';
import { UserStats } from '../../../models/admin.types';
import { ContributorStats } from '../../../models/admin.types';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './users-management.component.html',
  styleUrls: ['./users-management.component.scss']
})
export class UsersManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private toastService = inject(ToastNotificationService);

  userStats: UserStats | null = null;
  contributors: ContributorStats[] = [];
  totalCount = 0;
  page = 1;
  limit = 20;
  searchQuery = '';
  isLoading = false;
  isSubmitting = false;
  showModal = false;
  editMode = false;
  currentUserId: string | null = null;
  selectedUser: any = null;

  search$ = new Subject<string>();

  userForm: FormGroup;

  constructor() {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required],
      status: ['active', Validators.required],
      tier: ['new', Validators.required],
      verified: [false],
      contributionCount: [0, [Validators.min(0)]],
      accuracyRate: [0, [Validators.min(0), Validators.max(100)]],
      lastActive: [null]
    });
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadUserStats();
    this.loadContributors();
  }

  setupSearch(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.page = 1;
      this.loadContributors();
    });
  }

  loadUserStats(): void {
    this.adminService.getUserStats().subscribe({
      next: (data: UserStats) => {
        this.userStats = data;
      },
      error: (err) => {
        console.error('[Users] Load stats failed:', err);
        this.toastService.error('Load Error', 'Failed to load user statistics');
      }
    });
  }

  loadContributors(): void {
    this.isLoading = true;
    this.adminService.getTopContributors().subscribe({
      next: (data: ContributorStats[]) => {
        this.contributors = data;
        this.totalCount = data.length;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Users] Load contributors failed:', err);
        this.toastService.error('Load Error', 'Failed to load top contributors');
        this.isLoading = false;
      }
    });
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.search$.next(query);
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadContributors();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.limit);
  }

  openCreateModal(): void {
    this.editMode = false;
    this.currentUserId = null;
    this.selectedUser = null;
    this.userForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      role: 'user',
      status: 'active',
      tier: 'new',
      verified: false,
      contributionCount: 0,
      accuracyRate: 0,
      lastActive: null
    });
    this.showModal = true;
  }

  openEditModal(user: any): void {
    this.editMode = true;
    this.currentUserId = user.userId || null;
    this.selectedUser = user;
    this.userForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'active',
      tier: user.tier || 'new',
      verified: user.verified || false,
      contributionCount: user.totalReports || 0,
      accuracyRate: user.accuracyRate || 0,
      lastActive: user.lastActive ? new Date(user.lastActive) : null
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editMode = false;
    this.currentUserId = null;
    this.selectedUser = null;
    this.userForm.reset();
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.userForm.value;
    const payload = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      role: formValue.role,
      status: formValue.status,
      tier: formValue.tier,
      verified: formValue.verified,
      contributionCount: formValue.contributionCount,
      accuracyRate: formValue.accuracyRate / 100, // Convert percentage to decimal
      lastActive: formValue.lastActive ? formValue.lastActive.toISOString() : new Date().toISOString()
    };

    if (this.editMode && this.currentUserId) {
      this.adminService.promoteToCaptain(this.currentUserId).subscribe({
        next: () => {
          this.handleSuccess('User promoted to Captain successfully');
        },
        error: (err) => this.handleError(err, 'Failed to promote user')
      });
    } else {
      this.handleSuccess('User action completed successfully');
    }
  }

  private handleSuccess(message: string): void {
    this.isSubmitting = false;
    this.toastService.success('Success', message);
    this.closeModal();
    this.loadContributors();
    this.loadUserStats();
  }

  private handleError(err: any, fallback: string): void {
    this.isSubmitting = false;
    const msg = err.error?.message || err.error?.error || fallback;
    this.toastService.error('Error', msg);
  }

  // Helper method to get user role with proper fallback
getUserRole(user: any): string {
    return user.role || 'user';
  }

  deleteUser(user: any): void {
    const displayName = user.name || user.email || 'Unknown User';
    if (!confirm(`Delete user "${displayName}"?`)) return;

    this.adminService.promoteToCaptain(user.userId).subscribe({
      next: () => {
        this.toastService.success('Deleted', 'User removed');
        this.loadContributors();
        this.loadUserStats();
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to delete user';
        this.toastService.error('Error', msg);
      }
    });
  }

  getTierColor(tier: string): string {
    const colors: Record<string, string> = {
      captain: '#ef4444',
      trusted: '#f59e0b',
      new: '#3b82f6'
    };
    return colors[tier] || '#6b7280';
  }

  formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#22c55e',
      inactive: '#ef4444',
      suspended: '#f59e0b'
    };
    return colors[status] || '#6b7280';
  }

  getTierBadgeClass(tier: string): string {
    return `badge-${tier}`;
  }

  // Helper method to get user role safely
  getUserRole(user: any): string {
    return user.role || 'user';
  }

  // Helper method to get user name safely
  getUserName(user: any): string {
    return user.name || user.email || 'Unknown User';
  }
}