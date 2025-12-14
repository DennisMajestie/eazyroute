import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { TransportMode } from '../../../models/bus-stop.model';
import { TransportPointType, TRANSPORT_POINT_TYPES, TRANSPORT_MODES, getAllTransportPointTypes, getAllTransportModes } from '../../../models/transport-point.constants';
import { ChipInputComponent } from '../../../shared/components/chip-input/chip-input.component';
import { MapComponent } from '../../../shared/components/map/map.component';

@Component({
  selector: 'app-add-transport-point-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ChipInputComponent,
    MapComponent
  ],
  templateUrl: './add-transport-point-dialog.component.html',
  styleUrls: ['./add-transport-point-dialog.component.scss']
})
export class AddTransportPointDialogComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() pointAdded = new EventEmitter<any>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  pointForm!: FormGroup;
  isSubmitting = false;
  submitError: string = '';
  submitSuccess: string = '';

  // Options
  transportPointTypes = getAllTransportPointTypes();
  transportModes = getAllTransportModes();
  TRANSPORT_POINT_TYPES = TRANSPORT_POINT_TYPES;
  TRANSPORT_MODES = TRANSPORT_MODES;

  // Photos
  selectedPhotos: File[] = [];
  photoPreviewUrls: string[] = [];
  photoErrors: string[] = [];

  // Map
  selectedLocation: { lat: number; lng: number } | null = null;
  mapCenter = { lat: 9.0765, lng: 7.3986 }; // Abuja default
  mapMarkers: Array<{ lat: number; lng: number; title?: string }> = [];

  constructor(
    private fb: FormBuilder,
    private busStopService: BusStopService
  ) { }

  ngOnInit() {
    this.initForm();
    this.getCurrentLocation();
  }

  initForm() {
    this.pointForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: ['bus_stop', Validators.required],
      localNames: [[]],
      transportModes: [[], Validators.required],
      address: [''],
      city: [''],
      area: [''],
      description: ['', Validators.maxLength(500)]
    });
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.mapCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.setLocation(this.mapCenter.lat, this.mapCenter.lng);
        },
        (error) => {
          console.log('Location access denied, using default location');
        }
      );
    }
  }

  setLocation(lat: number, lng: number) {
    this.selectedLocation = { lat, lng };
    this.mapMarkers = [{ lat, lng, title: 'Selected Location' }];
  }

  onMapClick(event: any) {
    // This would be triggered by map click event
    // For now, we'll add a button to set location
    console.log('Map clicked', event);
  }

  useCurrentLocation() {
    this.getCurrentLocation();
  }

  // Transport Mode Selection
  isTransportModeSelected(mode: string): boolean {
    const modes = this.pointForm.get('transportModes')?.value || [];
    return modes.includes(mode);
  }

  toggleTransportMode(mode: string) {
    const modesControl = this.pointForm.get('transportModes');
    const currentModes = modesControl?.value || [];

    if (currentModes.includes(mode)) {
      modesControl?.setValue(currentModes.filter((m: string) => m !== mode));
    } else {
      modesControl?.setValue([...currentModes, mode]);
    }
  }

  // Photo Upload
  onPhotoSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    this.photoErrors = [];

    // Validate total count
    if (this.selectedPhotos.length + files.length > 5) {
      this.photoErrors.push('Maximum 5 photos allowed');
      return;
    }

    // Validate each file
    const validation = this.busStopService.validatePhotos(files);
    if (!validation.valid) {
      this.photoErrors = validation.errors;
      return;
    }

    // Add photos and create previews
    files.forEach(file => {
      this.selectedPhotos.push(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreviewUrls.push(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    input.value = '';
  }

  removePhoto(index: number) {
    this.selectedPhotos.splice(index, 1);
    this.photoPreviewUrls.splice(index, 1);
    this.photoErrors = [];
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  // Form Submission
  async onSubmit() {
    if (this.pointForm.invalid) {
      this.markFormGroupTouched(this.pointForm);
      this.submitError = 'Please fill in all required fields';
      return;
    }

    if (!this.selectedLocation) {
      this.submitError = 'Please select a location on the map';
      return;
    }

    const modesControl = this.pointForm.get('transportModes');
    if (!modesControl?.value || modesControl.value.length === 0) {
      this.submitError = 'Please select at least one transport mode';
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = '';

    const formData = {
      name: this.pointForm.value.name,
      type: this.pointForm.value.type as TransportPointType,
      latitude: this.selectedLocation.lat,
      longitude: this.selectedLocation.lng,
      localNames: this.pointForm.value.localNames || [],
      transportModes: this.pointForm.value.transportModes as TransportMode[],
      address: this.pointForm.value.address || undefined,
      city: this.pointForm.value.city || undefined,
      area: this.pointForm.value.area || undefined,
      description: this.pointForm.value.description || undefined,
      photos: this.selectedPhotos.length > 0 ? this.selectedPhotos : undefined
    };

    this.busStopService.submitTransportPoint(formData).subscribe({
      next: (result) => {
        this.submitSuccess = 'Point submitted for verification! 🎉';
        this.isSubmitting = false;

        // Emit success and close after delay
        setTimeout(() => {
          this.pointAdded.emit(result);
          this.onClose();
        }, 2000);
      },
      error: (error) => {
        console.error('Submission error:', error);
        this.submitError = error.error?.message || 'Failed to submit point. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  onClose() {
    this.close.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get descriptionCharCount(): number {
    return this.pointForm.get('description')?.value?.length || 0;
  }

  get selectedTypeConfig() {
    const type = this.pointForm.get('type')?.value;
    return TRANSPORT_POINT_TYPES[type as TransportPointType];
  }
}
