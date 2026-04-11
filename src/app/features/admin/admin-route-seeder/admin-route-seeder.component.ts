





import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
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
  processedLegsCount = 0;
  totalSegmentsToSeed = 0;

  // Autocomplete state
  fromSearch$ = new Subject<string>();
  toSearch$ = new Subject<string>();
  legSearch$ = new Subject<{ query: string; index: number }>();

  fromResults: any[] = [];
  toResults: any[] = [];
  legResults: any[][] = []; // Array of result arrays, indexed by leg index

  isSearchingFrom = false;
  isSearchingTo = false;
  isSearchingLeg: boolean[] = [];

  // Selected stop data for display
  selectedFromStopName = '';
  selectedToStopName = '';

  transportModes = ['KEKE', 'OKADA', 'TAXI', 'BUS'];

  ngOnInit() {
    this.seederForm = this.fb.group({
      fromStopId: ['', Validators.required],
      toStopId: ['', Validators.required],
      legs: this.fb.array([]), // Intermediate stops
      transportMode: ['KEKE', Validators.required],
      minPrice: [200, [Validators.required, Validators.min(0)]],
      maxPrice: [300, [Validators.required, Validators.min(0)]],
      isOneWay: [false]
    }, { validators: this.priceRangeValidator });

    this.setupAutocomplete();
  }

  get legs(): FormArray {
    return this.seederForm.get('legs') as FormArray;
  }

  addLeg() {
    const legForm = this.fb.group({
      stopId: ['', Validators.required],
      stopName: ['']
    });
    this.legs.push(legForm);
    this.legResults.push([]);
    this.isSearchingLeg.push(false);
  }

  removeLeg(index: number) {
    this.legs.removeAt(index);
    this.legResults.splice(index, 1);
    this.isSearchingLeg.splice(index, 1);
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

    this.legSearch$.pipe(
      debounceTime(300)
    ).subscribe(({ query, index }) => {
      if (query.trim().length > 2) {
        this.isSearchingLeg[index] = true;
        this.busStopService.searchBusStops(query).subscribe({
          next: (res: any) => {
            this.legResults[index] = res.success ? res.data : [];
            this.isSearchingLeg[index] = false;
          },
          error: () => {
            this.legResults[index] = [];
            this.isSearchingLeg[index] = false;
          }
        });
      } else {
        this.legResults[index] = [];
      }
    });
  }

  onLegSearch(event: Event, index: number) {
    const query = (event.target as HTMLInputElement).value;
    this.legSearch$.next({ query, index });
    // Clear selection if typing
    if (this.legs.at(index).get('stopId')?.value) {
      this.legs.at(index).patchValue({ stopId: '' });
    }
  }

  selectLegStop(stop: any, index: number) {
    this.legs.at(index).patchValue({
      stopId: stop._id || stop.id,
      stopName: stop.name
    });
    this.legResults[index] = []; // clear dropdown
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
    this.processedLegsCount = 0;

    const val = this.seederForm.value;
    
    // Decompose journey into segments
    // Sequence: [Origin, Leg1, Leg2, ..., Destination]
    const stopsSequence = [
      val.fromStopId,
      ...val.legs.map((l: any) => l.stopId),
      val.toStopId
    ];

    const segments: any[] = [];
    for (let i = 0; i < stopsSequence.length - 1; i++) {
      segments.push({
        fromStopId: stopsSequence[i],
        toStopId: stopsSequence[i+1],
        transportMode: val.transportMode,
        priceRange: { min: val.minPrice, max: val.maxPrice },
        isOneWay: val.isOneWay
      });
    }

    this.totalSegmentsToSeed = segments.length;
    
    // Seed segments one by one (sequentially) to ensure logs are orderly
    this.seedSegmentsSequentially(segments);
  }

  private seedSegmentsSequentially(segments: any[]) {
    if (segments.length === 0) {
      this.finishSubmission();
      return;
    }

    const current = segments.shift();
    this.adminService.seedRoute(current).subscribe({
      next: () => {
        this.processedLegsCount++;
        this.seedSegmentsSequentially(segments);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.submitError = `Failed at segment ${this.processedLegsCount + 1}: ` + (err.error?.message || 'Unknown error');
      }
    });
  }

  private finishSubmission() {
    this.isSubmitting = false;
    this.submitSuccess = true;
    
    // Reset form
    this.resetForm();
    
    setTimeout(() => this.submitSuccess = false, 5000);
  }

  private resetForm() {
    this.seederForm.reset({
      fromStopId: '',
      toStopId: '',
      transportMode: 'KEKE',
      minPrice: 200,
      maxPrice: 300,
      isOneWay: false
    });
    this.legs.clear();
    this.legResults = [];
    this.isSearchingLeg = [];
    this.selectedFromStopName = '';
    this.selectedToStopName = '';
  }
}
