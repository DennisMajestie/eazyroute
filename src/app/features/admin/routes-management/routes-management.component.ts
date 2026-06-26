import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';
import { RouteSegment, RouteSegmentsResponse } from '../../../models/admin.types';

@Component({
  selector: 'app-routes-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './routes-management.component.html',
  styleUrls: ['./routes-management.component.scss']
})
export class RoutesManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private toastService = inject(ToastNotificationService);

  segments: RouteSegment[] = [];
  filteredSegments: RouteSegment[] = [];
  totalCount = 0;
  page = 1;
  limit = 20;
  searchQuery = '';
  isLoading = false;
  isSubmitting = false;
  showModal = false;
  editMode = false;
  currentSegmentId: string | null = null;
  selectedSegment: RouteSegment | null = null;

  search$ = new Subject<string>();

  segmentForm: FormGroup;

  constructor() {
    this.segmentForm = this.fb.group({
      fromStopId: ['', Validators.required],
      toStopId: ['', Validators.required],
      transportModes: ['', Validators.required],
      estimatedTime: [null, [Validators.required, Validators.min(1)]],
      priceRange: this.fb.group({
        min: [0, [Validators.required, Validators.min(0)]],
        max: [0, [Validators.required, Validators.min(0)]]
      })
    });
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadSegments();
  }

  setupSearch(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.page = 1;
      this.loadSegments();
    });
  }

  loadSegments(): void {
    this.isLoading = true;
    this.adminService.getRouteSegments(this.page, this.limit).subscribe({
      next: (res: RouteSegmentsResponse) => {
        this.segments = res.segments || [];
        this.totalCount = res.total || 0;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Routes] Load failed:', err);
        this.toastService.error('Load Error', 'Failed to load route segments');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredSegments = this.segments;
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredSegments = this.segments.filter(s =>
        s.fromStop?.name.toLowerCase().includes(q) ||
        s.toStop?.name.toLowerCase().includes(q) ||
        s.transportModes.some(mode => mode.toLowerCase().includes(q)) ||
        s.estimatedTime.toString().includes(q) ||
        s.priceRange.min.toString().includes(q) ||
        s.priceRange.max.toString().includes(q)
      );
    }
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.search$.next(query);
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadSegments();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.limit);
  }

  openCreateModal(): void {
    this.editMode = false;
    this.currentSegmentId = null;
    this.segmentForm.reset({
      fromStopId: '',
      toStopId: '',
      transportModes: '',
      estimatedTime: null,
      priceRange: {
        min: 0,
        max: 0
      }
    });
    this.showModal = true;
  }

  openEditModal(segment: RouteSegment): void {
    this.editMode = true;
    this.currentSegmentId = segment._id || segment.id || null;
    this.selectedSegment = segment;
    this.segmentForm.patchValue({
      fromStopId: segment.fromStopId,
      toStopId: segment.toStopId,
      transportModes: segment.transportModes.join(', '),
      estimatedTime: segment.estimatedTime,
      priceRange: {
        min: segment.priceRange.min,
        max: segment.priceRange.max
      }
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editMode = false;
    this.currentSegmentId = null;
    this.selectedSegment = null;
    this.segmentForm.reset();
  }

  onSubmit(): void {
    if (this.segmentForm.invalid) {
      this.segmentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.segmentForm.value;
    const payload = {
      fromStopId: formValue.fromStopId,
      toStopId: formValue.toStopId,
      transportModes: formValue.transportModes.split(',').map((m: string) => m.trim()).filter(Boolean),
      estimatedTime: formValue.estimatedTime,
      priceRange: {
        min: formValue.priceRange.min,
        max: formValue.priceRange.max
      }
    };

    if (this.editMode && this.currentSegmentId) {
      this.adminService.updateRouteSegment(this.currentSegmentId, payload).subscribe({
        next: (updated) => {
          this.handleSuccess('Route segment updated successfully');
        },
        error: (err) => this.handleError(err, 'Failed to update route segment')
      });
    } else {
      this.adminService.createRouteSegment(payload).subscribe({
        next: (created) => {
          this.handleSuccess('Route segment created successfully');
        },
        error: (err) => this.handleError(err, 'Failed to create route segment')
      });
    }
  }

  private handleSuccess(message: string): void {
    this.isSubmitting = false;
    this.toastService.success('Success', message);
    this.closeModal();
    this.loadSegments();
  }

  private handleError(err: any, fallback: string): void {
    this.isSubmitting = false;
    const msg = err.error?.message || err.error?.error || fallback;
    this.toastService.error('Error', msg);
  }

  deleteSegment(segment: RouteSegment): void {
    const id = segment._id || segment.id;
    if (!id) return;

    if (!confirm(`Delete route segment from "${segment.fromStop?.name}" to "${segment.toStop?.name}"?`)) return;

    this.adminService.deleteRouteSegment(id).subscribe({
      next: () => {
        this.toastService.success('Deleted', 'Route segment removed');
        this.loadSegments();
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to delete segment';
        this.toastService.error('Error', msg);
      }
    });
  }

  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  }

  getModeColor(mode: string): string {
    const colors: Record<string, string> = {
      KEKE: '#f59e0b',
      OKADA: '#ef4444',
      TAXI: '#3b82f6',
      BUS: '#10b981',
      WALKING: '#6b7280'
    };
    return colors[mode] || '#6b7280';
  }
}