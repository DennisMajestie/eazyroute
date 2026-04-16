import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminService } from '../../../core/services/admin.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusStop } from '../../../models/bus-stop.model';

@Component({
  selector: 'app-soul-v2-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soul-v2-management.component.html',
  styleUrls: ['./soul-v2-management.component.scss']
})
export class SoulV2ManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private busStopService = inject(BusStopService);

  searchQuery$ = new Subject<string>();
  searchResults: any[] = [];
  selectedStop: BusStop | null = null;
  
  soulForm: FormGroup;
  isSearching = false;
  isSubmitting = false;
  showSuccess = false;
  errorMessage = '';

  firstLegModes = [
    { value: 'auto', label: 'Auto (System Default)' },
    { value: 'okada', label: 'Okada (Bike Only)' },
    { value: 'keke', label: 'Keke (Tricycle Only)' },
    { value: 'taxi', label: 'Taxi (Car Only)' }
  ];

  bridgeModes = [
    { value: 'any', label: 'Any (System Default)' },
    { value: 'keke', label: 'Keke (Tricycle Preferred)' },
    { value: 'taxi', label: 'Taxi (Car Preferred)' }
  ];

  constructor() {
    this.soulForm = this.fb.group({
      firstLegPreferredMode: ['auto'],
      bridgeModePreference: ['any']
    });
  }

  ngOnInit(): void {
    this.setupSearch();
  }

  setupSearch(): void {
    this.searchQuery$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim().length > 2) {
        this.isSearching = true;
        this.busStopService.searchBusStops(query).subscribe({
          next: (res: any) => {
            this.searchResults = res.success ? res.data : [];
            this.isSearching = false;
          },
          error: () => {
            this.searchResults = [];
            this.isSearching = false;
          }
        });
      } else {
        this.searchResults = [];
      }
    });
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery$.next(query);
  }

  selectStop(stop: any): void {
    this.selectedStop = stop;
    this.searchResults = [];
    
    // Patch form with current values
    this.soulForm.patchValue({
      firstLegPreferredMode: stop.firstLegPreferredMode || 'auto',
      bridgeModePreference: stop.bridgeModePreference || 'any'
    });
  }

  onSubmit(): void {
    if (!this.selectedStop || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.showSuccess = false;

    const stopId = ((this.selectedStop as any)._id || this.selectedStop.id).toString();
    const preferences = this.soulForm.value;

    this.adminService.updateBusStopPreferences(stopId, preferences).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.showSuccess = true;
        
        // Update local object
        if (this.selectedStop) {
          this.selectedStop.firstLegPreferredMode = preferences.firstLegPreferredMode;
          this.selectedStop.bridgeModePreference = preferences.bridgeModePreference;
        }
        
        setTimeout(() => this.showSuccess = false, 3000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to update preferences';
      }
    });
  }

  clearSelection(): void {
    this.selectedStop = null;
    this.soulForm.reset({
      firstLegPreferredMode: 'auto',
      bridgeModePreference: 'any'
    });
  }
}
