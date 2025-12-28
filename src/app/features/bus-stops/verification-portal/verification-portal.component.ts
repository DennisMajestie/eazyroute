import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusStop } from '../../../models/bus-stop.model';
import { MapComponent } from '../../../shared/components/map/map.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-verification-portal',
    standalone: true,
    imports: [CommonModule, MapComponent],
    templateUrl: './verification-portal.component.html',
    styleUrl: './verification-portal.component.scss'
})
export class VerificationPortalComponent implements OnInit {
    private busStopService = inject(BusStopService);
    private router = inject(Router);
    private toastr = inject(ToastrService);
    public authService = inject(AuthService);

    pendingStops: BusStop[] = [];
    isLoading = true;
    error: string | null = null;

    ngOnInit() {
        this.loadPendingStops();
    }

    async showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
        if (type === 'success') {
            this.toastr.success(message);
        } else if (type === 'error') {
            this.toastr.error(message);
        } else if (type === 'warning') {
            this.toastr.warning(message);
        }
    }

    loadPendingStops() {
        this.isLoading = true;
        this.busStopService.getPendingStops().subscribe({
            next: (stops) => {
                this.pendingStops = stops;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load pending stops', err);
                this.error = 'Failed to load places needing verification.';
                this.isLoading = false;
                this.showToast('Failed to load places needing verification.', 'error');
            }
        });
    }

    verifyPlace(stop: BusStop) {
        if (!stop.id) {
            this.showToast('Error: Stop ID is missing.', 'error');
            return;
        }

        this.busStopService.verifyStop(stop.id, 'verify').subscribe({
            next: () => {
                // Remove from list
                this.pendingStops = this.pendingStops.filter(s => s.id !== stop.id);
                this.showToast(`Successfully submitted! Thank you for helping the community.`);
            },
            error: (err) => {
                console.error('Verification failed', err);
                this.showToast('Action failed. Please try again.', 'error');
            }
        });
    }

    rejectPlace(stop: BusStop) {
        if (!stop.id) {
            this.showToast('Error: Stop ID is missing.', 'error');
            return;
        }

        this.busStopService.verifyStop(stop.id, 'reject').subscribe({
            next: () => {
                // Remove from list
                this.pendingStops = this.pendingStops.filter(s => s.id !== stop.id);
                this.showToast('Point reported as incorrect.', 'warning');
            },
            error: (err) => {
                console.error('Rejection failed', err);
                this.showToast('Action failed. Please try again.', 'error');
            }
        });
    }

    getMarkers(stop: BusStop) {
        const lat = typeof stop.latitude === 'number' ? stop.latitude : parseFloat(stop.latitude as any);
        const lng = typeof stop.longitude === 'number' ? stop.longitude : parseFloat(stop.longitude as any);

        if (isNaN(lat) || isNaN(lng)) return [];

        return [{
            lat,
            lng,
            title: stop.name
        }];
    }

    getSafeCoords(stop: BusStop) {
        const lat = typeof stop.latitude === 'number' ? stop.latitude : parseFloat(stop.latitude as any);
        const lng = typeof stop.longitude === 'number' ? stop.longitude : parseFloat(stop.longitude as any);

        if (isNaN(lat) || isNaN(lng)) {
            return { lat: 9.0765, lng: 7.3986 }; // Fallback to Abuja
        }
        return { lat, lng };
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }
}
