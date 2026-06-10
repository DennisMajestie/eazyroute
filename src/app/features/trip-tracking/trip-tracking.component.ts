// src/app/features/trip-tracking/trip-tracking.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subject, takeUntil, interval, startWith } from 'rxjs';
import { EasyrouteOrchestratorService, OrchestratorState } from '../../core/services/easyroute-orchestrator.service';
import { GeolocationService, Coordinates } from '../../core/services/geolocation.service';
import { RouteSegment, GeneratedRoute } from '../../core/engines/types/easyroute.types';
import { MapComponent } from '../../shared/components/map/map.component';
import { SosButtonComponent } from '../../shared/components/sos-button/sos-button.component';

interface CurrentStepInfo {
    segmentIndex: number;
    segment: RouteSegment;
    instruction: string;
    fromStop: string;
    toStop: string;
    transportMode: string;
    transportIcon: string;
    cost: number;
    estimatedTime: number;
    isLastSegment: boolean;
}

@Component({
    selector: 'app-trip-tracking',
    standalone: true,
    imports: [CommonModule, RouterModule, MapComponent, SosButtonComponent],
    templateUrl: './trip-tracking.component.html',
    styleUrls: ['./trip-tracking.component.scss']
})
export class TripTrackingComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private orchestrator = inject(EasyrouteOrchestratorService);
    private geolocationService = inject(GeolocationService);
    private destroy$ = new Subject<void>();

    // State observables
    orchestratorState$!: Observable<OrchestratorState>;
    currentRoute: GeneratedRoute | null = null;
    currentSegmentIndex = 0;
    completedSegments: Set<number> = new Set();
    tripStartTime: Date | null = null;
    totalPlannedDuration = 0;

    // UI State
    currentStep: CurrentStepInfo | null = null;
    etaMinutes = 0;
    distanceRemainingKm = 0;
    totalCost = 0;
    progressPercent = 0;
    isArrived = false;
    distanceToNextStopM = Infinity;
    showCelebrationModal = false;

    routeMonitorTitle = 'Route monitor active';
    routeMonitorMessage = 'We are checking your position against the planned route in real time.';
    routeStatusBadge = 'On route';
    routeStatusClass = 'on-track';
    routeStatusIcon = 'fa-check-circle';
    lastUpdatedLabel = 'GPS synced';
    gpsStatusLabel = 'Location signal stable';
    movementLabel = 'Live';
    movementStatusClass = 'moving';
    movementSpeedKmh = 0;
    private lastMovementSample: { latitude: number; longitude: number; timestamp: number } | null = null;

    // Map - Updated to include user marker
    center: { lat: number; lng: number } = { lat: 9.0579, lng: 7.4951 }; // Abuja default
    zoom = 14;
    userMarker: { lat: number; lng: number; title?: string; tier?: string } | null = null;
    markers: Array<{ lat: number; lng: number; title?: string; tier?: string }> = [];
    routePolylines: any[] = [];

    // Clock for live updates
    currentTime = new Date();

    ngOnInit(): void {
        this.orchestratorState$ = this.orchestrator.state$;

        // Subscribe to state changes
        this.orchestrator.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
            if (!state.hasActiveTrip) {
                // No active trip - the template will show the empty state UI
                // Don't redirect, let user see the "No Active Trip" message
                this.currentRoute = null;
                this.currentStep = null;
                return;
            }

            this.currentRoute = state.activeRoute || null;
            this.currentSegmentIndex = state.currentSegmentIndex || 0;

            if (this.currentRoute) {
                this.tripStartTime = state.tripStartTime || null;
                this.totalPlannedDuration = this.currentRoute.totalTime || 0;
                this.updateCurrentStep();
                this.calculateProgress();
                this.updateMapData();
                this.updateRouteMonitoring(state);
                
                // Update user marker position on map
                if (state.currentLocation) {
                    this.updateUserMarker(state.currentLocation);
                    this.updateMovementIndicator(state.currentLocation);
                }
                
                this.checkArrivalProximity(state.currentLocation);
                this.updateRouteMonitoring(state);
            }
        });

        // Update clock every second for live feel
        interval(1000).pipe(
            startWith(0),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.currentTime = new Date();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Update user marker position on map
     */
    private updateUserMarker(location: any): void {
        if (!location?.latitude || !location?.longitude) return;

        this.userMarker = {
            lat: location.latitude,
            lng: location.longitude,
            title: 'Your Location',
            tier: 'primary'
        };

        // Update markers array for map component
        this.markers = [this.userMarker];
    }

    private updateRouteMonitoring(state: OrchestratorState): void {
        const location = state.currentLocation as any;
        const distance = Number.isFinite(this.distanceToNextStopM) ? this.distanceToNextStopM : Infinity;

        if (state.deviationDetected) {
            this.routeStatusBadge = 'Off route';
            this.routeStatusClass = 'off-route';
            this.routeStatusIcon = 'fa-exclamation-triangle';
            this.routeMonitorTitle = 'We detected you are leaving the planned path';
            this.routeMonitorMessage = 'Please realign to the current segment to stay on the right direction.';
        } else if (this.isArrived) {
            this.routeStatusBadge = 'At stop';
            this.routeStatusClass = 'near-stop';
            this.routeStatusIcon = 'fa-map-marker-alt';
            this.routeMonitorTitle = 'You are at the next stop';
            this.routeMonitorMessage = 'Tap “Arrived at Stop” to move to the next step when you are ready.';
        } else if (distance < 150) {
            this.routeStatusBadge = 'Almost there';
            this.routeStatusClass = 'near-stop';
            this.routeStatusIcon = 'fa-location-arrow';
            this.routeMonitorTitle = 'You are close to the next stop';
            this.routeMonitorMessage = 'Keep the route visible and confirm your position as you approach the stop.';
        } else {
            this.routeStatusBadge = 'On route';
            this.routeStatusClass = 'on-track';
            this.routeStatusIcon = 'fa-check-circle';
            this.routeMonitorTitle = 'Route monitor is active';
            this.routeMonitorMessage = 'Your journey is being checked against the planned route in real time.';
        }

        this.lastUpdatedLabel = this.getLastUpdatedLabel(location?.timestamp);
        this.gpsStatusLabel = this.getGpsStatusLabel(location);
    }

    private getLastUpdatedLabel(timestamp?: number | Date): string {
        if (!timestamp) {
            return 'Live tracking';
        }

        const updatedAt = timestamp instanceof Date ? timestamp.getTime() : Number(timestamp);
        const diffSeconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));

        if (diffSeconds < 5) {
            return 'Updated just now';
        }
        if (diffSeconds < 30) {
            return `Updated ${diffSeconds}s ago`;
        }
        return `Updated ${Math.ceil(diffSeconds / 60)} min ago`;
    }

    private getGpsStatusLabel(location: any): string {
        const accuracy = typeof location?.accuracy === 'number' ? location.accuracy : undefined;
        const confidence = typeof location?.confidence === 'number' ? location.confidence : undefined;

        if (accuracy !== undefined && accuracy > 0) {
            if (accuracy <= 25) {
                return `GPS accuracy: ${Math.round(accuracy)}m (strong)`;
            }
            if (accuracy <= 75) {
                return `GPS accuracy: ${Math.round(accuracy)}m (moderate)`;
            }
            return `GPS accuracy: ${Math.round(accuracy)}m (low)`;
        }

        if (confidence !== undefined) {
            return `GPS confidence: ${Math.round(confidence)}%`;
        }

        return 'Location signal stable';
    }

    private updateMovementIndicator(location: any): void {
        if (!location?.latitude || !location?.longitude) {
            return;
        }

        const now = location.timestamp instanceof Date
            ? location.timestamp.getTime()
            : (typeof location.timestamp === 'number' ? location.timestamp : Date.now());

        if (this.lastMovementSample) {
            const distanceKm = this.haversineDistance(
                this.lastMovementSample.latitude,
                this.lastMovementSample.longitude,
                location.latitude,
                location.longitude
            );
            const deltaSeconds = Math.max(1, (now - this.lastMovementSample.timestamp) / 1000);
            const speedKmh = distanceKm / (deltaSeconds / 3600);

            this.movementSpeedKmh = Number.isFinite(speedKmh) ? speedKmh : 0;
            this.movementLabel = speedKmh >= 1 ? 'Moving' : 'Holding position';
            this.movementStatusClass = speedKmh >= 1 ? 'moving' : 'idle';
        } else {
            this.movementLabel = 'Tracking';
            this.movementStatusClass = 'moving';
            this.movementSpeedKmh = 0;
        }

        this.lastMovementSample = {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: now
        };
    }

    private updateCurrentStep(): void {
        if (!this.currentRoute || !this.currentRoute.segments) return;

        const segments = this.currentRoute.segments;
        if (this.currentSegmentIndex >= segments.length) {
            this.currentStep = null;
            return;
        }

        const segment = segments[this.currentSegmentIndex];
        const modeKey = this.getSegmentModeIdentifier(segment);

        this.currentStep = {
            segmentIndex: this.currentSegmentIndex,
            segment,
            instruction: segment.instructions || this.generateInstruction(segment),
            fromStop: segment.fromStop?.name || 'Unknown',
            toStop: segment.toStop?.name || 'Unknown',
            transportMode: this.getSegmentModeName(segment),
            transportIcon: this.getTransportIcon(modeKey),
            cost: segment.cost || 0,
            estimatedTime: segment.estimatedTime || 0,
            isLastSegment: this.currentSegmentIndex === segments.length - 1
        };
    }

    private generateInstruction(segment: RouteSegment): string {
        const modeName = this.getSegmentModeName(segment);
        const to = segment.toStop?.name || 'your destination';

        if (modeName.toLowerCase() === 'walk' || modeName.toLowerCase() === 'walking') {
            return `Walk to ${to}`;
        }
        return `Take ${modeName} to ${to}`;
    }

    public getSegmentModeIdentifier(segment: RouteSegment): string {
        const extract = (value: any): string => {
            if (value == null) return '';
            if (typeof value === 'string') return value;
            if (typeof value === 'object') {
                return String(value.type || value.name || value.vehicleType || value.label || '');
            }
            return String(value);
        };

        const humanLabel = extract(segment.mode?.name || (segment as any).mode?.name || (segment as any).name).toLowerCase();
        const vehicleLabel = extract((segment as any).vehicleType || (segment as any).mode?.type || (segment as any).type).toLowerCase();
        const fallbackLabel = extract(segment.mode?.type || '').toLowerCase();

        const rawMode = humanLabel.includes('keke') || humanLabel.includes('okada') || humanLabel.includes('bus') ||
            humanLabel.includes('taxi') || humanLabel.includes('walk') || humanLabel.includes('bike')
            ? humanLabel
            : (vehicleLabel || fallbackLabel || 'walk');

        const mode = rawMode.toLowerCase();

        if (mode === 'bike' || mode === 'bicycle' || mode === 'motorcycle' || mode === 'motorbike') {
            return 'okada';
        }
        if (mode.includes('okada')) {
            return 'okada';
        }
        if (mode.includes('keke') || mode.includes('napep') || mode.includes('tricycle')) {
            return 'keke';
        }
        if (mode.includes('bus') || mode.includes('danfo')) {
            return 'bus';
        }
        if (mode.includes('taxi') || mode.includes('cab') || mode.includes('car')) {
            return 'taxi';
        }
        if (mode.includes('walk')) {
            return 'walk';
        }
        return mode || 'walk';
    }

    private getSegmentModeName(segment: RouteSegment): string {
        const identifier = this.getSegmentModeIdentifier(segment);
        const labelMap: Record<string, string> = {
            walk: 'Walking',
            bus: 'Bus',
            keke: 'Keke',
            okada: 'Okada',
            taxi: 'Taxi'
        };

        if (segment.mode?.name && typeof segment.mode.name === 'string' && !['bike', 'bicycle', 'motorcycle'].includes(segment.mode.name.toLowerCase())) {
            return segment.mode.name;
        }

        return labelMap[identifier] || 'Transit';
    }

    getTransportIcon(type: string | undefined): string {
        const icons: Record<string, string> = {
            'walk': 'fas fa-walking',
            'bus': 'fas fa-bus',
            'keke': 'fas fa-motorcycle',
            'okada': 'fas fa-motorcycle',
            'taxi': 'fas fa-taxi',
            'brt': 'fas fa-bus-alt',
            'train': 'fas fa-train'
        };
        return icons[type || 'walk'] || 'fas fa-route';
    }

    private calculateProgress(): void {
        if (!this.currentRoute || !this.currentRoute.segments) return;

        const segments = this.currentRoute.segments;
        const totalSegments = segments.length;

        // Calculate completed percentage
        this.progressPercent = Math.round((this.currentSegmentIndex / totalSegments) * 100);

        // Calculate remaining time and distance
        let remainingTime = 0;
        let remainingDistance = 0;

        for (let i = this.currentSegmentIndex; i < segments.length; i++) {
            remainingTime += segments[i].estimatedTime || 0;
            remainingDistance += segments[i].distance || 0;
        }

        this.etaMinutes = remainingTime;
        this.distanceRemainingKm = remainingDistance / 1000;
        this.totalCost = this.currentRoute.totalCost || 0;
    }

    private checkArrivalProximity(userLocation: any): void {
        if (!userLocation || !this.currentStep?.segment?.toStop) {
            this.isArrived = false;
            this.distanceToNextStopM = Infinity;
            return;
        }

        const stop = this.currentStep.segment.toStop;
        if (!stop.latitude || !stop.longitude) {
            this.isArrived = false;
            return;
        }

        // Calculate distance in meters
        this.distanceToNextStopM = this.haversineDistance(
            userLocation.latitude, userLocation.longitude,
            stop.latitude, stop.longitude
        ) * 1000;

        // Enabled if within 100 meters
        this.isArrived = this.distanceToNextStopM <= 100;
        this.updateRouteMonitoring(this.orchestrator.getState());
    }

    private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private updateMapData(): void {
        if (!this.currentRoute) return;

        // Build polyline from route segments
        const coordinates: [number, number][] = [];

        this.currentRoute.segments.forEach(segment => {
            if (segment.fromStop?.latitude && segment.fromStop?.longitude) {
                coordinates.push([segment.fromStop.latitude, segment.fromStop.longitude]);
            }
            if (segment.toStop?.latitude && segment.toStop?.longitude) {
                coordinates.push([segment.toStop.latitude, segment.toStop.longitude]);
            }
        });

        if (coordinates.length > 0) {
            this.center = { lat: coordinates[0][0], lng: coordinates[0][1] };
            this.routePolylines = [{
                coordinates,
                color: '#4A90D9',
                weight: 4
            }];
        }
    }

    // Actions
    showEndTripModal = false;

    // Actions
    async stopTrip(): Promise<void> {
        this.showEndTripModal = true;
    }

    async confirmEndTrip(): Promise<void> {
        this.showEndTripModal = false;
        this.goToDashboard();
    }

    goToDashboard(): void {
        this.orchestrator.endTrip();
        this.router.navigate(['/dashboard']);
    }

    cancelEndTrip(): void {
        this.showEndTripModal = false;
    }

    async markSegmentComplete(): Promise<void> {
        if (!this.isArrived && this.distanceToNextStopM !== Infinity) {
            console.warn('[TripTracking] Too far to mark complete');
            return;
        }

        if (this.currentStep?.isLastSegment) {
            this.showCelebrationModal = true;
            return;
        }

        this.completedSegments.add(this.currentSegmentIndex);
        try {
            await this.orchestrator.advanceToNextSegment();
            // Reset arrival for next segment
            this.isArrived = false;
        } catch (error) {
            console.error('[TripTracking] Failed to advance segment:', error);
            this.currentSegmentIndex++;
            this.updateCurrentStep();
            this.calculateProgress();
        }
    }

    reportIssue(): void {
        // TODO: Implement issue reporting modal
        alert('Report issue feature coming soon!');
    }

    getSegmentStatus(index: number): 'completed' | 'current' | 'upcoming' {
        if (this.completedSegments.has(index) || index < this.currentSegmentIndex) {
            return 'completed';
        }
        if (index === this.currentSegmentIndex) {
            return 'current';
        }
        return 'upcoming';
    }

    getFormattedETA(): string {
        // Use dynamic ETA (current time + remaining minutes) for the most accurate real-time arrival estimate
        const arrival = new Date(this.currentTime.getTime() + this.etaMinutes * 60000);
        return arrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
}