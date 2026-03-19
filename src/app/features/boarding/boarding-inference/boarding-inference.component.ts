import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { HierarchyBreadcrumbComponent } from '../../../shared/components/hierarchy-breadcrumb/hierarchy-breadcrumb.component';
import { LocalityService } from '../../../core/services/locality.service';
import { MicroNode } from '../../../models/locality.model';

interface BoardingPoint {
    anchor: {
        name: string;
        localNames: string[];
        type: string;
        transportModes: string[];
        microInstructions?: string;
        latitude: number;
        longitude: number;
    };
    walkingDistance: number;
    boardingProbability: number;
    estimatedWalkTime: number;
    microNode?: MicroNode;  // ALONG Framework
}

@Component({
    selector: 'app-boarding-inference',
    standalone: true,
    imports: [CommonModule, HierarchyBreadcrumbComponent],
    templateUrl: './boarding-inference.component.html',
    styleUrls: ['./boarding-inference.component.scss']
})
export class BoardingInferenceComponent implements OnInit {
    // Location data (ALONG Framework)
    currentLocation: { lat: number; lng: number; name?: string; hierarchy?: string; type?: string } | null = null;
    destination: { lat: number; lng: number; name?: string; hierarchy?: string; type?: string } | null = null;

    // Boarding points
    boardingPoints: BoardingPoint[] = [];
    bestOption: BoardingPoint | null = null;

    // UI state
    isLoading = false;
    error: string = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private localityService: LocalityService
    ) { }

    ngOnInit() {
        // Get location from query params (ALONG Framework)
        this.route.queryParams.subscribe(params => {
            if (params['fromLat'] && params['fromLng']) {
                this.currentLocation = {
                    lat: parseFloat(params['fromLat']),
                    lng: parseFloat(params['fromLng']),
                    name: params['fromName'] || 'Your Location',
                    hierarchy: params['fromHierarchy'],
                    type: params['fromType']
                };
            }

            if (params['toLat'] && params['toLng']) {
                this.destination = {
                    lat: parseFloat(params['toLat']),
                    lng: parseFloat(params['toLng']),
                    name: params['toName'] || 'Destination',
                    hierarchy: params['toHierarchy'],
                    type: params['toType']
                };
            }

            if (this.currentLocation) {
                this.inferBoardingPoints();
            }
        });
    }

    /**
     * Call ALONG API to infer boarding points
     */
    inferBoardingPoints() {
        if (!this.currentLocation) return;
        if (this.currentLocation.lat === 0 && this.currentLocation.lng === 0) return;

        this.isLoading = true;
        this.error = '';

        const url = `${environment.apiUrl}/along/infer-boarding`;
        const params = {
            latitude: this.currentLocation.lat.toString(),
            longitude: this.currentLocation.lng.toString(),
            maxWalkingDistance: '500' // 500 meters
        };

        this.http.get<{ success: boolean; data: BoardingPoint[] }>(url, { params })
            .subscribe({
                next: (response) => {
                    if (response.success && Array.isArray(response.data)) {
                        this.boardingPoints = response.data;

                        // Sort by boarding probability (highest first)
                        this.boardingPoints.sort((a, b) => b.boardingProbability - a.boardingProbability);

                        // Set best option (highest probability)
                        if (this.boardingPoints.length > 0) {
                            this.bestOption = this.boardingPoints[0];
                        }
                    }
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Boarding inference error:', error);
                    this.error = 'Could not find boarding points. Please try again.';
                    this.isLoading = false;
                }
            });
    }

    /**
     * Get transport mode icon class (Font Awesome 6.x)
     */
    getTransportModeIcon(mode: string): string {
        const iconMap: { [key: string]: string } = {
            'keke': 'fa-solid fa-tricycle', // Fallback to custom if needed, or use fa-shuttle-van/fa-motorcycle
            'okada': 'fa-solid fa-motorcycle',
            'cab': 'fa-solid fa-taxi',
            'taxi': 'fa-solid fa-taxi',
            'bus': 'fa-solid fa-bus',
            'walking': 'fa-solid fa-person-walking'
        };
        // Specific overrides for Nigerian context if FA icons aren't perfect
        if (mode.toLowerCase() === 'keke') return 'fa-solid fa-van-shuttle'; // Closest common FA icon

        return iconMap[mode.toLowerCase()] || 'fa-solid fa-location-dot';
    }

    /**
     * Get probability stars as an array for template looping
     */
    getProbabilityStarsArray(probability: number): boolean[] {
        const starCount = Math.round(probability * 5);
        return Array(5).fill(false).map((_, i) => i < starCount);
    }

    /**
     * Show on map
     */
    showOnMap(point: BoardingPoint) {
        // Navigate to map view with this point
        this.router.navigate(['/map'], {
            queryParams: {
                lat: point.anchor.latitude,
                lng: point.anchor.longitude,
                name: point.anchor.name
            }
        });
    }

    /**
     * Select boarding point and continue to route
     */
    selectBoardingPoint(point: BoardingPoint) {
        if (!this.destination) return;

        // Navigate to route display with boarding point as new start
        this.router.navigate(['/route-display'], {
            queryParams: {
                fromLat: point.anchor.latitude,
                fromLng: point.anchor.longitude,
                fromName: point.anchor.name,
                toLat: this.destination.lat,
                toLng: this.destination.lng,
                toName: this.destination.name
            }
        });
    }

    /**
     * Get area from hierarchy string (ALONG Framework)
     */
    getAreaFromHierarchy(): string | undefined {
        if (!this.currentLocation?.hierarchy) return undefined;
        const parts = this.currentLocation.hierarchy.split(' → ');
        return parts[0];
    }

    /**
     * Get locality from hierarchy string (ALONG Framework)
     */
    getLocalityFromHierarchy(): string | undefined {
        if (!this.currentLocation?.hierarchy) return undefined;
        const parts = this.currentLocation.hierarchy.split(' → ');
        return parts[1];
    }

    /**
     * Get anchor from hierarchy string (ALONG Framework)
     */
    getAnchorFromHierarchy(): string | undefined {
        if (!this.currentLocation?.hierarchy) return undefined;
        const parts = this.currentLocation.hierarchy.split(' → ');
        return parts[2];
    }

    /**
     * Go back
     */
    goBack() {
        this.router.navigate(['/home']);
    }
}
