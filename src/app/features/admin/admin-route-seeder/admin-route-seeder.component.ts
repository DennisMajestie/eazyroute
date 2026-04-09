import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminService } from '../../../core/services/admin.service';
import { BusStopService } from '../../../core/services/bus-stop.service';

@Component({
  selector: 'app-admin-route-seeder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-route-seeder.component.html',
  styleUrls: ['./admin-route-seeder.component.scss']
})
export class AdminRouteSeederComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private busStopService = inject(BusStopService);

  seederForm!: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  // Autocomplete state
  fromSearch$ = new Subject<string>();
  toSearch$ = new Subject<string>();
  fromResults: any[] = [];
  toResults: any[] = [];
  isSearchingFrom = false;
  isSearchingTo = false;

  // Selected stop data for display
  selectedFromStopName = '';
  selectedToStopName = '';

  transportModes = ['KEKE', 'OKADA', 'TAXI', 'BUS'];

  ngOnInit() {
    this.seederForm = this.fb.group({
      fromStopId: ['', Validators.required],
      toStopId: ['', Validators.required],
      transportMode: ['KEKE', Validators.required],
      minPrice: [200, [Validators.required, Validators.min(0)]],
      maxPrice: [300, [Validators.required, Validators.min(0)]],
      isOneWay: [false]
    }, { validators: this.priceRangeValidator });

    this.setupAutocomplete();
  }

  // Ensure maxPrice >= minPrice
  priceRangeValidator(g: FormGroup) {
    const min = g.get('minPrice')?.value;
    const max = g.get('maxPrice')?.value;
    return min !== null && max !== null && min <= max ? null : { 'priceRangeInvalid': true };
  }

  setupAutocomplete() {
    this.fromSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim().length > 2) {
        this.isSearchingFrom = true;
        this.busStopService.searchBusStops(query).subscribe({
          next: (res: any) => {
            this.fromResults = res.success ? res.data : [];
            this.isSearchingFrom = false;
          },
          error: () => {
            this.fromResults = [];
            this.isSearchingFrom = false;
          }
        });
      } else {
        this.fromResults = [];
      }
    });

    this.toSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim().length > 2) {
        this.isSearchingTo = true;
        this.busStopService.searchBusStops(query).subscribe({
          next: (res: any) => {
            this.toResults = res.success ? res.data : [];
            this.isSearchingTo = false;
          },
          error: () => {
            this.toResults = [];
            this.isSearchingTo = false;
          }
        });
      } else {
        this.toResults = [];
      }
    });
  }

  onFromSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.fromSearch$.next(query);
    // Clear selection if typing
    if (this.seederForm.get('fromStopId')?.value) {
      this.seederForm.patchValue({ fromStopId: '' });
    }
  }

  onToSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.toSearch$.next(query);
    // Clear selection if typing
    if (this.seederForm.get('toStopId')?.value) {
      this.seederForm.patchValue({ toStopId: '' });
    }
  }

  selectFromStop(stop: any) {
    this.selectedFromStopName = stop.name;
    this.seederForm.patchValue({ fromStopId: stop._id || stop.id });
    this.fromResults = []; // clear dropdown
  }

  selectToStop(stop: any) {
    this.selectedToStopName = stop.name;
    this.seederForm.patchValue({ toStopId: stop._id || stop.id });
    this.toResults = []; // clear dropdown
  }

  onSubmit() {
    if (this.seederForm.invalid) {
      this.seederForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = '';

    const val = this.seederForm.value;
    const payload = {
      fromStopId: val.fromStopId,
      toStopId: val.toStopId,
      transportMode: val.transportMode,
      priceRange: { min: val.minPrice, max: val.maxPrice },
      isOneWay: val.isOneWay
    };

    this.adminService.seedRoute(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        // Optionally reset form
        this.seederForm.reset({
          fromStopId: '',
          toStopId: '',
          transportMode: 'KEKE',
          minPrice: 200,
          maxPrice: 300,
          isOneWay: false
        });
        this.selectedFromStopName = '';
        this.selectedToStopName = '';
        setTimeout(() => this.submitSuccess = false, 5000);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.submitError = err.error?.message || 'Failed to seed segment. It may already exist.';
      }
    });
  }
}
