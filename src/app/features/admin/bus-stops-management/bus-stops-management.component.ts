import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';
import { BusStop, BusStopsResponse } from '../../../models/admin.types';

@Component({
  selector: 'app-bus-stops-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './bus-stops-management.component.html',
  styleUrls: ['./bus-stops-management.component.scss']
})
export class BusStopsManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private toastService = inject(ToastNotificationService);

  stops: BusStop[] = [];
  filteredStops: BusStop[] = [];
  totalCount = 0;
  page = 1;
  limit = 20;
  searchQuery = '';
  isLoading = false;
  isSubmitting = false;
  showModal = false;
  editMode = false;
  currentStopId: string | null = null;
  selectedStop: BusStop | null = null;

  search$ = new Subject<string>();

  stopForm: FormGroup;

  constructor() {
    this.stopForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      localNames: [''],
      city: ['', Validators.required],
      area: [''],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      verificationStatus: ['pending'],
      isActive: [true],
      transportModes: [[]],
      soulV2Preferences: this.fb.group({
        firstLegPreferredMode: [''],
        bridgeModePreference: ['']
      })
    });
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadStops();
  }

  setupSearch(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.page = 1;
      this.loadStops();
    });
  }

  loadStops(): void {
    this.isLoading = true;
    this.adminService.getBusStops(this.page, this.limit, this.searchQuery).subscribe({
      next: (res: BusStopsResponse) => {
        this.stops = res.stops || [];
        this.totalCount = res.total || 0;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[BusStops] Load failed:', err);
        this.toastService.error('Load Error', 'Failed to load bus stops');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredStops = this.stops;
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredStops = this.stops.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.area || '').toLowerCase().includes(q) ||
        s.verificationStatus.toLowerCase().includes(q)
      );
    }
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.search$.next(query);
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadStops();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.limit);
  }

  openCreateModal(): void {
    this.editMode = false;
    this.currentStopId = null;
    this.stopForm.reset({
      name: '',
      localNames: '',
      city: '',
      area: '',
      latitude: null,
      longitude: null,
      verificationStatus: 'pending',
      isActive: true,
      transportModes: [],
      soulV2Preferences: {
        firstLegPreferredMode: '',
        bridgeModePreference: ''
      }
    });
    this.showModal = true;
  }

  openEditModal(stop: BusStop): void {
    this.editMode = true;
    this.currentStopId = stop._id || stop.id || null;
    this.selectedStop = stop;
    this.stopForm.patchValue({
      name: stop.name,
      localNames: stop.localNames?.join(', ') || '',
      city: stop.city,
      area: stop.area || '',
      latitude: stop.location?.coordinates[1] || null,
      longitude: stop.location?.coordinates[0] || null,
      verificationStatus: stop.verificationStatus,
      isActive: stop.isActive,
      transportModes: stop.transportModes || [],
      soulV2Preferences: {
        firstLegPreferredMode: stop.soulV2Preferences?.firstLegPreferredMode || '',
        bridgeModePreference: stop.soulV2Preferences?.bridgeModePreference || ''
      }
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editMode = false;
    this.currentStopId = null;
    this.selectedStop = null;
    this.stopForm.reset();
  }

  onSubmit(): void {
    if (this.stopForm.invalid) {
      this.stopForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.stopForm.value;
    const coordinates: [number, number] = [Number(formValue.longitude) || 0, Number(formValue.latitude) || 0];
    const payload: Partial<BusStop> = {
      name: formValue.name,
      localNames: formValue.localNames.split(',').map((s: string) => s.trim()).filter(Boolean),
      city: formValue.city,
      area: formValue.area,
      location: {
        type: 'Point',
        coordinates
      },
      verificationStatus: formValue.verificationStatus,
      isActive: formValue.isActive,
      transportModes: formValue.transportModes || [],
      soulV2Preferences: formValue.soulV2Preferences
    };

    if (this.editMode && this.currentStopId) {
      this.adminService.updateBusStop(this.currentStopId, payload).subscribe({
        next: (updated) => {
          this.handleSuccess('Bus stop updated successfully');
        },
        error: (err) => this.handleError(err, 'Failed to update bus stop')
      });
    } else {
      this.adminService.createBusStop(payload).subscribe({
        next: (created) => {
          this.handleSuccess('Bus stop created successfully');
        },
        error: (err) => this.handleError(err, 'Failed to create bus stop')
      });
    }
  }

  private handleSuccess(message: string): void {
    this.isSubmitting = false;
    this.toastService.success('Success', message);
    this.closeModal();
    this.loadStops();
  }

  private handleError(err: any, fallback: string): void {
    this.isSubmitting = false;
    const msg = err.error?.message || err.error?.error || fallback;
    this.toastService.error('Error', msg);
  }

  toggleActive(stop: BusStop): void {
    const id = stop._id || stop.id;
    if (!id) return;

    const newStatus = !stop.isActive;
    this.adminService.updateBusStop(id, { isActive: newStatus }).subscribe({
      next: (updated) => {
        stop.isActive = updated.isActive;
        this.toastService.success('Updated', `Stop ${newStatus ? 'activated' : 'deactivated'}`);
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to toggle status';
        this.toastService.error('Error', msg);
      }
    });
  }

  deleteStop(stop: BusStop): void {
    const id = stop._id || stop.id;
    if (!id) return;

    if (!confirm(`Delete bus stop "${stop.name}"?`)) return;

    this.adminService.deleteBusStop(id).subscribe({
      next: () => {
        this.toastService.success('Deleted', 'Bus stop removed');
        this.loadStops();
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to delete stop';
        this.toastService.error('Error', msg);
      }
    });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      verified: '#22c55e',
      pending: '#f59e0b',
      rejected: '#ef4444',
      inactive: '#6b7280'
    };
    return colors[status] || '#6b7280';
  }

  getModeColors(modes: string[]): string {
    if (!modes || modes.length === 0) return '#6b7280';
    const colorMap: Record<string, string> = {
      KEKE: '#f59e0b',
      OKADA: '#ef4444',
      TAXI: '#3b82f6',
      BUS: '#10b981',
      WALKING: '#6b7280'
    };
    return colorMap[modes[0]] || '#6b7280';
  }

  formatCoords(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}