import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AlongService } from '../../../core/services/along.service';
import { SafetyService, SafetyTip } from '../../../core/services/safety.service';
import { CommuterProtocolService, BoardingProtocol } from '../../../core/services/commuter-protocol.service';
import { AlongRoute, AlongSegment } from '../../../models/transport.types';
import { SubmitPriceComponent } from '../../community/submit-price/submit-price.component';

@Component({
    selector: 'app-route-display',
    standalone: true,
    imports: [CommonModule, SubmitPriceComponent],
    templateUrl: './route-display.component.html',
    styleUrls: ['./route-display.component.scss']
})
export class RouteDisplayComponent implements OnInit {
    // Route data
    routes: AlongRoute[] = [];
    selectedRouteIndex: number = 0;

    // UI state
    isLoading = false;
    error: string = '';
    expandedSegments: Set<number> = new Set();
    showStops: { [key: number]: boolean } = {};

    // Safety
    isNightMode = false;
    nightTips: SafetyTip[] = [];

    // Crowdsourcing (Price Submission)
    showSubmitPriceModal = false;
    submitData = { from: '', to: '', mode: '', fromId: '', toId: '' };

    fromLocation: { lat: number; lng: number; name: string } | null = null;
    toLocation: { lat: number; lng: number; name: string } | null = null;

    get route(): AlongRoute | null {
        return this.routes[this.selectedRouteIndex] || null;
    }

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private alongService: AlongService,
        private safetyService: SafetyService,
        private protocolService: CommuterProtocolService
    ) { }

    /**
     * Measure difference between routes (Cost/Time)
     */
    getRouteDiff(route: AlongRoute): string {
        const current = this.routes[0]; // Compare against best/first route
        if (!current || route === current) return '';

        const costDiff = (route.totalCost || 0) - (current.totalCost || 0);
        const timeDiff = (route.totalTime || 0) - (current.totalTime || 0);

        if (costDiff < 0) return `Save ₦${Math.abs(costDiff)}`;
        if (timeDiff < 0) return `${Math.abs(timeDiff)} min faster`;

        return '';
    }

    /**
     * Select a specific route
     */
    selectRoute(index: number) {
        this.selectedRouteIndex = index;
        this.expandedSegments.clear();
        this.showStops = {};
    }

    /**
     * Toggle intermediate stops dropdown
     */
    toggleStops(index: number) {
        this.showStops[index] = !this.showStops[index];
    }

    ngOnInit() {
        // Check Night Mode
        this.isNightMode = this.safetyService.isNightMode();
        if (this.isNightMode) {
            this.nightTips = this.safetyService.NIGHT_SAFETY_TIPS;
        }

        // Get locations from query params
        this.activatedRoute.queryParams.subscribe(params => {
            // Check for From location (Hybrid, Coordinate, or Name-only)
            if (params['fromName']) {
                if (params['isHybridFrom'] || (!params['fromLat'] && !params['fromLng'])) {
                    // Treat as name-based lookup (hybrid mode)
                    this.fromLocation = { lat: 0, lng: 0, name: params['fromName'] };
                } else if (params['fromLat'] && params['fromLng']) {
                    this.fromLocation = {
                        lat: parseFloat(params['fromLat']),
                        lng: parseFloat(params['fromLng']),
                        name: params['fromName']
                    };
                }
            }

            // Check for To location (Hybrid, Coordinate, or Name-only)
            if (params['toName']) {
                if (params['isHybridTo'] || (!params['toLat'] && !params['toLng'])) {
                    // Treat as name-based lookup (hybrid mode)
                    this.toLocation = { lat: 0, lng: 0, name: params['toName'] };
                } else if (params['toLat'] && params['toLng']) {
                    this.toLocation = {
                        lat: parseFloat(params['toLat']),
                        lng: parseFloat(params['toLng']),
                        name: params['toName']
                    };
                }
            }

            if (this.fromLocation && this.toLocation) {
                this.generateRoute();
            }
        });
    }

    /**
     * Call ALONG API to generate route
     */
    generateRoute() {
        if (!this.fromLocation || !this.toLocation) return;

        this.isLoading = true;
        this.error = '';

        // Prepare inputs for service (string if hybrid, object if coords)
        const fromInput = (this.fromLocation.lat === 0 && this.fromLocation.lng === 0)
            ? this.fromLocation.name
            : this.fromLocation;

        const toInput = (this.toLocation.lat === 0 && this.toLocation.lng === 0)
            ? this.toLocation.name
            : this.toLocation;

        this.alongService.generateRoute(fromInput, toInput)
            .subscribe({
                next: (response: any) => {
                    console.log('[RouteDisplay] API Response:', response);

                    if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
                        // Defensive Filtering
                        this.routes = response.data.filter((r: any) => !!r);
                        this.selectedRouteIndex = 0;

                        // Post-process instructions for all routes
                        this.routes.forEach(r => {
                            if (!r) return;
                            r.instructions = (r.instructions || [])
                                .filter(i => !!i);

                            if (r.instructions.length === 0) {
                                r.instructions = (Array.isArray(r.segments) ? r.segments : [])
                                    .map((s: any) => s?.instruction || s?.instructions || '')
                                    .filter((i: any) => !!i);
                            }
                        });

                    } else if (response?.errorType === 'LOCATION_NOT_COVERED') {
                        this.error = response.suggestion || 'This area is not yet covered by ALONG.';
                    } else {
                        console.warn('[RouteDisplay] Unexpected response structure:', response);
                        this.error = response?.message || 'No route found for this path.';
                        this.routes = [];
                    }
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('[RouteDisplay] Subscription Failed:', err);
                    this.error = err.error?.message || 'Failed to generate route. Please try again.';
                    this.routes = [];
                    this.isLoading = false;
                }
            });

    }

    /**
     * Get strategy icon
     */
    getStrategyIcon(strategy: string): string {
        switch (strategy) {
            case 'shortest': return '⚡';
            case 'cheapest': return '💰';
            case 'balanced': return '⚖️';
            case 'hub-based': return '🏙️';
            case 'safe': return '🛡️';
            case 'fastest': return '🚀';
            default: return '📍';
        }
    }

    /**
     * Get strategy label
     */
    getStrategyLabel(strategy: string): string {
        switch (strategy) {
            case 'shortest': return 'Fastest';
            case 'cheapest': return 'Cheapest';
            case 'balanced': return 'Balanced';
            case 'hub-based': return 'Hub-Based';
            case 'safe': return 'Safe Route';
            case 'fastest': return 'Fastest';
            default: return 'Standard';
        }
    }

    /**
     * Get strategy CSS class
     */
    getStrategyClass(strategy: string): string {
        switch (strategy) {
            case 'shortest': return 'strategy-shortest';
            case 'cheapest': return 'strategy-cheapest';
            case 'balanced': return 'strategy-balanced';
            case 'hub-based': return 'strategy-hub';
            case 'safe': return 'strategy-safe';
            default: return 'strategy-default';
        }
    }

    /**
     * Get segment emoji based on type
     */
    getSegmentEmoji(segment: AlongSegment): string {
        const mode = (segment.vehicleType || '').toLowerCase();
        const type = (segment.type || '').toLowerCase();
        const identifier = mode || type || 'unknown';

        const emojiMap: { [key: string]: string } = {
            'walk': '🚶',
            'walking': '🚶',
            'keke': '🛺',
            'okada': '🏍️',
            'cab': '🚕',
            'taxi': '🚕',
            'car': '🚕',
            'bus': '🚌',
            'danfo': '🚌',
            'transfer': '🔄',
            'cross': '🔄',
            'wait': '⏳',
            'ride': '🚗',
            'transit': '🚌'
        };
        return emojiMap[identifier] || '📍';
    }

    /**
     * Get segment color based on type
     */
    getSegmentColor(segment: AlongSegment): string {
        const mode = (segment.vehicleType || '').toLowerCase();
        const type = (segment.type || '').toLowerCase();
        const identifier = mode || type || 'unknown';

        const colorMap: { [key: string]: string } = {
            'walk': 'var(--walking-color)',
            'walking': 'var(--walking-color)',
            'keke': 'var(--keke-color)',
            'okada': 'var(--okada-color)',
            'cab': 'var(--taxi-color)',
            'taxi': 'var(--taxi-color)',
            'car': 'var(--taxi-color)',
            'bus': 'var(--bus-color)',
            'danfo': 'var(--bus-color)',
            'transfer': 'var(--transfer-color)',
            'cross': 'var(--transfer-color)',
            'wait': 'var(--walking-color)',
            'transit': 'var(--bus-color)'
        };
        return colorMap[identifier] || 'var(--primary)';
    }

    /**
     * Format cost value safely
     */
    formatCost(cost: any): string {
        if (cost === null || cost === undefined) return '0';
        if (typeof cost === 'number') return cost.toString();
        if (typeof cost === 'string') return cost;
        if (typeof cost === 'object') {
            return (cost.amount || cost.value || cost.total || cost.min || '0').toString();
        }
        return '0';
    }

    /**
     * Get cost display string
     */
    getCostDisplay(): string {
        if (!this.route) return '₦0';

        let min = this.route.minCost;
        let max = this.route.maxCost;

        // Extract from totalCost object if missing
        if (min === undefined && max === undefined && typeof this.route.totalCost === 'object') {
            const tc = this.route.totalCost as any;
            if (tc && tc.min !== undefined) min = tc.min;
            if (tc && tc.max !== undefined) max = tc.max;
        }

        if (typeof min === 'number' && typeof max === 'number') {
            if (min === max) return `₦${min}`;
            return `₦${min} - ₦${max}`;
        }

        return `₦${this.formatCost(this.route.totalCost)}`;
    }

    /**
     * Get icon for cardinal directions
     */
    getDirectionIcon(instruction: string): string {
        const lower = instruction.toLowerCase();
        if (lower.includes('north-east') || lower.includes('northeast')) return '↗️';
        if (lower.includes('north-west') || lower.includes('northwest')) return '↖️';
        if (lower.includes('south-east') || lower.includes('southeast')) return '↘️';
        if (lower.includes('south-west') || lower.includes('southwest')) return '↙️';
        if (lower.includes('north')) return '⬆️';
        if (lower.includes('south')) return '⬇️';
        if (lower.includes('east')) return '➡️';
        if (lower.includes('west')) return '⬅️';
        return '📍';
    }

    /**
     * Toggle segment expansion
     */
    toggleSegment(index: number) {
        if (this.expandedSegments.has(index)) {
            this.expandedSegments.delete(index);
        } else {
            this.expandedSegments.add(index);
        }
    }

    /**
     * Check if segment is expanded
     */
    isSegmentExpanded(index: number): boolean {
        return this.expandedSegments.has(index);
    }

    /**
     * Start journey
     */
    startJourney() {
        if (!this.route) return;

        // Navigate to trip tracking with route data
        this.router.navigate(['/trip-tracking'], {
            queryParams: {
                routeData: JSON.stringify(this.route)
            }
        });
    }

    /**
     * Share route via WhatsApp
     */
    shareRoute() {
        if (!this.route) return;

        const message = `🌍 Along_9ja\n\n` +
            `From: ${this.route.from}\n` +
            `To: ${this.route.to}\n\n` +
            `⏱️ ${this.route.totalTime} min | 💰 ₦${this.route.totalCost} | 📏 ${(this.route.totalDistance / 1000).toFixed(1)}km\n\n` +
            `Steps:\n${this.route.instructions.join('\n')}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    /**
     * Go back
     */
    goBack() {
        this.router.navigate(['/home']);
    }

    /**
     * Open Price Submission Modal for a specific segment
     */
    openSubmitPrice(segment: AlongSegment) {
        this.submitData = {
            from: segment.fromStop || segment.instruction.split(' from ')[1]?.split(' to ')[0] || 'Unknown Origin',
            to: segment.toStop || segment.instruction.split(' to ')[1] || 'Unknown Dest',
            mode: (segment.vehicleType || 'keke').toLowerCase(),
            fromId: 'UNKNOWN', // MVP: Backend handles name resolution or accepts names
            toId: 'UNKNOWN'
        };
        this.showSubmitPriceModal = true;
    }

    onPriceSubmitted() {
        // Show success toast or just refresh route? 
        // usage: RouteSegmentService.incrementPopularity might happen in background
    }

    /**
     * Get Boarding Protocol for a segment
     */
    getHubProtocol(segment: AlongSegment): BoardingProtocol | null {
        if (!segment.fromStop) return null;

        // Check if there is a protocol for this hub and destination
        const result = this.protocolService.getProtocolForDestination(
            segment.fromStop,
            segment.toStop || ''
        );

        return result ? result.protocol : null;
    }
}
