import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { MapComponent } from '../../../shared/components/map/map.component';
import { environment } from '../../../../environments/environment';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-add-place',
    standalone: true,
    imports: [CommonModule, FormsModule, MapComponent],
    templateUrl: './add-place.component.html',
    styleUrl: './add-place.component.scss'
})
export class AddPlaceComponent {
    private busStopService = inject(BusStopService);
    private router = inject(Router);
    private location = inject(Location);
    private geolocationService = inject(GeolocationService);

    // Map Settings
    center = { lat: 9.0765, lng: 7.3986 }; // Default Abuja
    markers: any[] = [];

    // Form Data
    place = {
        name: '',
        localName: '',
        description: '',
        type: 'bus_stop',
        latitude: 9.0765,
        longitude: 7.3986
    };

    isDetecting = false;
    isSubmitting = false;
    showSuccess = false;

    constructor() {
        this.detectLocation(); // Auto-detect on load
    }

    async detectLocation() {
        this.isDetecting = true;
        try {
            const coords = await firstValueFrom(this.geolocationService.getCurrentPosition());
            this.updateLocation(coords.latitude, coords.longitude);
        } catch (error) {
            console.warn('[AddPlace] Geolocation failed:', error);
        } finally {
            this.isDetecting = false;
        }
    }

    updateLocation(lat: number, lng: number) {
        this.center = { lat, lng };
        this.place.latitude = lat;
        this.place.longitude = lng;

        // Update marker
        this.markers = [{
            lat,
            lng,
            title: 'New Place Location',
            draggable: true // Map component needs to support this or we handle map clicks
        }];
    }

    submitPlace() {
        if (!this.place.name) return;

        // Validation: Ensure coordinates are non-zero (or outside baseline 0,0)
        if (Math.abs(this.place.latitude) < 0.0001 && Math.abs(this.place.longitude) < 0.0001) {
            alert('Please select a valid location on the map.');
            return;
        }

        this.isSubmitting = true;

        this.busStopService.submitPlace(this.place).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.showSuccess = true;

                // Auto-redirect after delay
                setTimeout(() => {
                    this.goBack();
                }, 3000);
            },
            error: (err) => {
                console.error('Submission failed', err);
                this.isSubmitting = false;
                alert('Failed to submit. Please try again.');
            }
        });
    }

    goBack() {
        this.location.back();
    }
}
