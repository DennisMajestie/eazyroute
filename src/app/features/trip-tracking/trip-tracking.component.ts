// src/app/features/trip-tracking/trip-tracking.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subject, map, takeUntil, interval, startWith } from 'rxjs';
import { EasyrouteOrchestratorService, OrchestratorState } from '../../core/services/easyroute-orchestrator.service';
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
    private destroy$ = new Subject<void>();

    // State observables
    orchestratorState$!: Observable<OrchestratorState>;
    currentRoute: GeneratedRoute | null = null;
    currentSegmentIndex = 0;
    completedSegments: Set<number> = new Set();

    // UI State
    currentStep: CurrentStepInfo | null = null;
    etaMinutes = 0;
    distanceRemainingKm = 0;
    totalCost = 0;
    progressPercent = 0;

    // Map
    center: { lat: number; lng: number } = { lat: 9.0579, lng: 7.4951 }; // Abuja default
    zoom = 14;
    userMarker: { lat: number; lng: number } | null = null;
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
                this.updateCurrentStep();
                this.calculateProgress();
                this.updateMapData();
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

    private updateCurrentStep(): void {
        if (!this.currentRoute || !this.currentRoute.segments) return;

        const segments = this.currentRoute.segments;
        if (this.currentSegmentIndex >= segments.length) {
            this.currentStep = null;
            return;
        }

        const segment = segments[this.currentSegmentIndex];
        this.currentStep = {
            segmentIndex: this.currentSegmentIndex,
            segment,
            instruction: segment.instructions || this.generateInstruction(segment),
            fromStop: segment.fromStop?.name || 'Unknown',
            toStop: segment.toStop?.name || 'Unknown',
            transportMode: segment.mode?.name || 'Unknown',
            transportIcon: this.getTransportIcon(segment.mode?.type),
            cost: segment.cost || 0,
            estimatedTime: segment.estimatedTime || 0,
            isLastSegment: this.currentSegmentIndex === segments.length - 1
        };
    }

    private generateInstruction(segment: RouteSegment): string {
        const mode = segment.mode?.type || 'walk';
        const to = segment.toStop?.name || 'your destination';

        if (mode === 'walk') {
            return `Walk to ${to}`;
        }
        return `Take ${segment.mode?.name || mode} to ${to}`;
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
        try {
            await this.orchestrator.endTrip();
            this.router.navigate(['/dashboard']);
        } catch (error) {
            console.error('[TripTracking] Error stopping trip:', error);
            // Optionally show an error toast here
        }
    }

    cancelEndTrip(): void {
        this.showEndTripModal = false;
    }

    async markSegmentComplete(): Promise<void> {
        this.completedSegments.add(this.currentSegmentIndex);
        try {
            await this.orchestrator.advanceToNextSegment();
            // The subscription to state$ will update this.currentSegmentIndex and trigger UI updates
        } catch (error) {
            console.error('[TripTracking] Failed to advance segment:', error);
            // Fallback for local UI only if orchestrator fails
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
        const arrival = new Date(this.currentTime.getTime() + this.etaMinutes * 60000);
        return arrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
}
