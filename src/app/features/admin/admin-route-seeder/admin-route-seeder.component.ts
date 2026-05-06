





import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { AdminService } from '../../../core/services/admin.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-route-seeder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './admin-route-seeder.component.html',
  styleUrls: ['./admin-route-seeder.component.scss']
})
export class AdminRouteSeederComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private busStopService = inject(BusStopService);
  private route = inject(ActivatedRoute);

  seederForm!: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';
  processedLegsCount = 0;
  totalSegmentsToSeed = 0;
  showSuccessModal = false;

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

  transportModes = ['keke', 'okada', 'taxi', 'bus', 'walking'];
  
  // Quick Node Creation State
  showQuickCreate = false;
  quickCreateTarget: 'from' | 'to' | number | null = null;
  quickNode = {
    name: '',
    latitude: 0,
    longitude: 0,
    area: 'Abuja Central'
  };
  isCreatingNode = false;

  ngOnInit() {
    this.seederForm = this.fb.group({
      fromStopId: ['', Validators.required],
      toStopId: ['', Validators.required],
      legs: this.fb.array([]), // Intermediate stops
      // These root fields now represent the FINAL segment (from last leg to destination)
      transportMode: ['keke', Validators.required],
      minPrice: [200, [Validators.required, Validators.min(0)]],
      maxPrice: [300, [Validators.required, Validators.min(0)]],
      isOneWay: [false],
      isAlternative: [false]
    }, { validators: this.rootPriceRangeValidator });

    this.setupAutocomplete();
    this.checkQueryParams();
  }

  private checkQueryParams() {
    this.route.queryParams.subscribe(params => {
      if (params['from']) {
        this.busStopService.getBusStopById(params['from']).subscribe({
          next: (res: any) => {
            if (res.success && res.data) {
              this.selectFromStop(res.data);
            }
          },
          error: (err: any) => console.error('Error loading stop from query param:', err)
        });
      }
    });
  }

  get legs(): FormArray {
    return this.seederForm.get('legs') as FormArray;
  }

  addLeg() {
    const legForm = this.fb.group({
      stopId: ['', Validators.required],
      stopName: [''],
      transportMode: ['keke', Validators.required],
      minPrice: [200, [Validators.required, Validators.min(0)]],
      maxPrice: [300, [Validators.required, Validators.min(0)]],
      isOneWay: [false],
      isAlternative: [false]
    }, { validators: this.legPriceRangeValidator });
    
    this.legs.push(legForm);
    this.legResults.push([]);
    this.isSearchingLeg.push(false);
  }

  removeLeg(index: number) {
    this.legs.removeAt(index);
    this.legResults.splice(index, 1);
    this.isSearchingLeg.splice(index, 1);
  }

  // Ensure maxPrice >= minPrice for the root (destination segment)
  rootPriceRangeValidator(g: FormGroup) {
    const min = g.get('minPrice')?.value;
    const max = g.get('maxPrice')?.value;
    return min !== null && max !== null && min <= max ? null : { 'priceRangeInvalid': true };
  }

  // Ensure maxPrice >= minPrice for each leg
  legPriceRangeValidator(g: any) {
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
        this.busStopService.searchBusStops(query, true).subscribe({
          next: (res: any) => {
            this.fromResults = (res.success && res.data) ? res.data : [];
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
        this.busStopService.searchBusStops(query, true).subscribe({
          next: (res: any) => {
            this.toResults = (res.success && res.data) ? res.data : [];
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
        this.busStopService.searchBusStops(query, true).subscribe({
          next: (res: any) => {
            this.legResults[index] = (res.success && res.data) ? res.data : [];
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
    
    // Build segments array
    const segments: any[] = [];
    
    // Segment 1 to N: From previous to current leg
    let currentFromId = val.fromStopId;
    let currentFromName = this.selectedFromStopName;
    for (const leg of val.legs) {
      segments.push({
        fromStopId: currentFromId,
        fromName: currentFromName,
        toStopId: leg.stopId,
        toName: leg.stopName,
        transportMode: leg.transportMode,
        priceRange: { min: leg.minPrice, max: leg.maxPrice },
        isOneWay: leg.isOneWay ?? false,
        isAlternative: leg.isAlternative ?? false
      });
      currentFromId = leg.stopId;
      currentFromName = leg.stopName;
    }

    // Final Segment: From last leg (or origin) to Destination
    segments.push({
      fromStopId: currentFromId,
      fromName: currentFromName,
      toStopId: val.toStopId,
      toName: this.selectedToStopName,
      transportMode: val.transportMode,
      priceRange: { min: val.minPrice, max: val.maxPrice },
      isOneWay: val.isOneWay ?? false,
      isAlternative: val.isAlternative ?? false
    });

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
        
        let message = 'Unknown error';
        if (err.status === 409) {
          // 🛑 CONFLICT: Show SweetAlert2 Modal
          Swal.fire({
            title: 'Segment Already Exists',
            text: `The segment ${current.fromName} -> ${current.toName} (${current.transportMode}) already exists. Would you like to replace it with this new data?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Replace it!',
            cancelButtonText: 'No, Skip it',
            confirmButtonColor: '#3b82f6',
            background: '#ffffff',
            customClass: {
              popup: 'glass-modal'
            }
          }).then((result) => {
            if (result.isConfirmed) {
              // Retry with replace flag
              const retrySegment = { ...current, replace: true };
              this.adminService.seedRoute(retrySegment).subscribe({
                next: () => {
                  this.processedLegsCount++;
                  this.seedSegmentsSequentially(segments);
                },
                error: (retryErr: any) => {
                  this.isSubmitting = false;
                  this.submitError = `Critical Error during replacement: ${retryErr.error?.message || retryErr.message}`;
                }
              });
            } else {
              // Skip and move to next leg
              this.processedLegsCount++;
              this.seedSegmentsSequentially(segments);
            }
          });
          return; // Pause sequential execution until modal is answered
        } else if (err.status === 400) {
          message = err.error?.message || err.message || 'Validation failed. Check coordinates or prices.';
        } else if (err.status === 403) {
          message = 'Forbidden: Admin privileges required.';
        } else if (err.status === 0) {
          message = 'Cannot connect to server. Check your internet connection.';
        } else {
          // 🛡️ Deep Error Extraction: Handle strings, objects, and nested Mongoose errors
          const errorBody = err.error;
          if (typeof errorBody === 'string') {
            message = errorBody;
          } else if (errorBody && typeof errorBody === 'object') {
            message = errorBody.message || errorBody.error || JSON.stringify(errorBody);
            if (errorBody.errors && Array.isArray(errorBody.errors)) {
              // Extract specific field errors if available
              const details = errorBody.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
              message += ` (${details})`;
            }
          } else {
            message = err.message || 'Seeding failed.';
          }
        }

        this.submitError = `Failed at segment ${this.processedLegsCount + 1}: ${message}`;
        console.error(`[Seeder Error] Segment ${this.processedLegsCount + 1}:`, err);
      }
    });
  }

  private finishSubmission() {
    this.isSubmitting = false;
    this.submitSuccess = true;
    this.showSuccessModal = true;
    
    // Trigger global stats refresh
    this.adminService.triggerRefresh();

    // Reset form
    this.resetForm();
    
    setTimeout(() => this.submitSuccess = false, 5000);
  }

  private resetForm() {
    this.seederForm.reset({
      fromStopId: '',
      toStopId: '',
      transportMode: 'keke',
      minPrice: 200,
      maxPrice: 300,
      isOneWay: false,
      isAlternative: false
    });
    this.legs.clear();
    this.legResults = [];
    this.isSearchingLeg = [];
    this.selectedFromStopName = '';
    this.selectedToStopName = '';
  }

  toggleQuickCreate(target: 'from' | 'to' | number) {
    if (this.quickCreateTarget === target && this.showQuickCreate) {
      this.showQuickCreate = false;
      this.quickCreateTarget = null;
    } else {
      this.showQuickCreate = true;
      this.quickCreateTarget = target;
      // Pre-fill name if they already typed something
      if (target === 'from') this.quickNode.name = this.selectedFromStopName;
      else if (target === 'to') this.quickNode.name = this.selectedToStopName;
      else if (typeof target === 'number') this.quickNode.name = this.legs.at(target).get('stopName')?.value;
    }
  }

  createQuickNode() {
    if (!this.quickNode.name || !this.quickNode.latitude || !this.quickNode.longitude) {
      return;
    }

    this.isCreatingNode = true;
    this.busStopService.createBusStop({
       name: this.quickNode.name,
       latitude: this.quickNode.latitude,
       longitude: this.quickNode.longitude,
       area: this.quickNode.area
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const newNode = res.data;
          // Auto-select the new node
          if (this.quickCreateTarget === 'from') {
            this.selectFromStop(newNode);
          } else if (this.quickCreateTarget === 'to') {
            this.selectToStop(newNode);
          } else if (typeof this.quickCreateTarget === 'number') {
            this.selectLegStop(newNode, this.quickCreateTarget);
          }
          
          this.showQuickCreate = false;
          this.quickCreateTarget = null;
          this.quickNode = { name: '', latitude: 0, longitude: 0, area: 'Abuja Central' };
        }
        this.isCreatingNode = false;
      },
      error: (err) => {
        console.error('Error creating node:', err);
        this.isCreatingNode = false;
      }
    });
  }
}
