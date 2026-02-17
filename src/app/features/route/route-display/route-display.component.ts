import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AlongService } from '../../../core/services/along.service';
import { SafetyService, SafetyTip } from '../../../core/services/safety.service';
import { CommuterProtocolService, BoardingProtocol } from '../../../core/services/commuter-protocol.service';
import { EasyrouteOrchestratorService } from '../../../core/services/easyroute-orchestrator.service';
import { AlongRoute, AlongSegment, IDynamicAdjustment } from '../../../models/transport.types';
import { SubmitPriceComponent } from '../../community/submit-price/submit-price.component';
import { MapComponent } from '../../../shared/components/map/map.component';
import { CommunityService } from '../../../core/services/community.service';
import { CommunityReport } from '../../../models/community.types';

@Component({
    selector: 'app-route-display',
    standalone: true,
    imports: [CommonModule, FormsModule, SubmitPriceComponent, MapComponent],
    templateUrl: './route-display.component.html',
    styleUrls: ['./route-display.component.scss']
})
export class RouteDisplayComponent implements OnInit {
    // Route data
    // Route data (Hybrid Intelligence)
    routes: AlongRoute[] = [];
    recommendedRoute: AlongRoute | null = null;
    alternativeRoutes: AlongRoute[] = [];

    selectedRouteIndex: number = 0;
    showAlternatives: boolean = false;

    // UI state
    isLoading = false;
    isStartingJourney = false;
    error: string = '';
    expandedSegments: Set<number> = new Set();
    showStops: { [key: number]: boolean } = {};

    // Safety
    isNightMode = false;
    nightTips: SafetyTip[] = [];

    // Street Realism
    useStreetMode: boolean = true; // Default to true as per "Aha!" feedback

    // Crowd-sourcing & Intelligence
    showSubmitPriceModal = false;
    submitData = { from: '', to: '', mode: '', fromId: '', toId: '', distance: 0, estimatedTime: 0 };

    showReportingModal = false;
    currentReportingSegment: AlongSegment | null = null;
    reportType: 'fare' | 'wait_time' | 'risk_alert' | 'stop_alias' = 'fare';
    reportValue: any = {
        fare: null,
        waitTime: 'medium',
        riskAlert: '',
        stopAlias: ''
    };
    isSubmittingReport = false;

    fromLocation: { lat: number; lng: number; name: string } | null = null;
    toLocation: { lat: number; lng: number; name: string } | null = null;

    // ===== CACHED MAP DATA (avoids infinite change detection) =====
    mapCenter: { lat: number; lng: number } = { lat: 9.0765, lng: 7.3986 };
    mapMarkers: Array<{ lat: number; lng: number; title?: string; tier?: 'primary' | 'sub-landmark' | 'node' }> = [];
    mapPolylines: Array<{ path: any[]; color?: string; weight?: number; isBackbone?: boolean }> = [];

    get route(): AlongRoute | null {
        // Return selected alternative OR recommended route
        if (this.selectedRouteIndex === -1) {
            return this.recommendedRoute;
        }
        return this.routes[this.selectedRouteIndex] || null;
    }

    /**
     * Recompute map data — call this only when the route changes.
     */
    private updateMapData() {
        const currentRoute = this.route;

        // Center
        if (!currentRoute || !currentRoute.segments.length) {
            this.mapCenter = { lat: 9.0765, lng: 7.3986 };
        } else {
            const firstSeg = currentRoute.segments[0];
            const lastSeg = currentRoute.segments[currentRoute.segments.length - 1];
            const fromStop = firstSeg.fromStop as any;
            const toStop = lastSeg.toStop as any;

            const lat1 = fromStop?.latitude || this.fromLocation?.lat || 9.0765;
            const lng1 = fromStop?.longitude || this.fromLocation?.lng || 7.3986;
            const lat2 = toStop?.latitude || this.toLocation?.lat || lat1;
            const lng2 = toStop?.longitude || this.toLocation?.lng || lng1;

            this.mapCenter = { lat: (lat1 + lat2) / 2, lng: (lng1 + lng2) / 2 };
        }

        // Markers
        if (!currentRoute) {
            this.mapMarkers = [];
        } else {
            const markers: Array<{ lat: number; lng: number; title?: string; tier?: 'primary' | 'sub-landmark' | 'node' }> = [];

            currentRoute.segments.forEach((seg, i) => {
                const from = seg.fromStop as any;
                const to = seg.toStop as any;

                if (from?.latitude && from?.longitude) {
                    markers.push({
                        lat: from.latitude,
                        lng: from.longitude,
                        title: from.name || this.getStopName(seg.fromStop),
                        tier: i === 0 ? 'primary' : 'node'
                    });
                }

                if (to?.latitude && to?.longitude) {
                    markers.push({
                        lat: to.latitude,
                        lng: to.longitude,
                        title: to.name || this.getStopName(seg.toStop),
                        tier: i === currentRoute.segments.length - 1 ? 'primary' : 'node'
                    });
                }
            });

            // Fallback: use from/to locations if no segment coordinates
            if (markers.length === 0) {
                if (this.fromLocation && this.fromLocation.lat !== 0) {
                    markers.push({ lat: this.fromLocation.lat, lng: this.fromLocation.lng, title: this.fromLocation.name, tier: 'primary' });
                }
                if (this.toLocation && this.toLocation.lat !== 0) {
                    markers.push({ lat: this.toLocation.lat, lng: this.toLocation.lng, title: this.toLocation.name, tier: 'primary' });
                }
            }

            this.mapMarkers = markers;
        }

        // Polylines
        if (!currentRoute) {
            this.mapPolylines = [];
        } else {
            const lines: Array<{ path: any[]; color?: string; weight?: number; isBackbone?: boolean }> = [];

            currentRoute.segments.forEach(seg => {
                if (seg.path?.coordinates && seg.path.coordinates.length >= 2) {
                    const leafletPath = seg.path.coordinates.map(coord => [coord[1], coord[0]]);
                    lines.push({
                        path: leafletPath,
                        color: this.getSegmentColor(seg).replace(/var\(--[^)]+\)/, '#0ea5e9'),
                        weight: seg.backbonePriority ? 6 : 4,
                        isBackbone: seg.backbonePriority
                    });
                } else {
                    const from = seg.fromStop as any;
                    const to = seg.toStop as any;
                    if (from?.latitude && from?.longitude && to?.latitude && to?.longitude) {
                        lines.push({
                            path: [[from.latitude, from.longitude], [to.latitude, to.longitude]],
                            color: '#0ea5e9',
                            weight: seg.backbonePriority ? 6 : 4,
                            isBackbone: seg.backbonePriority
                        });
                    }
                }
            });

            this.mapPolylines = lines;
        }
    }

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private alongService: AlongService,
        private safetyService: SafetyService,
        private protocolService: CommuterProtocolService,
        private orchestrator: EasyrouteOrchestratorService,
        private communityService: CommunityService
    ) { }

    /**
     * Measure difference between routes (Cost/Time)
     */
    getRouteDiff(route: AlongRoute): string {
        const current = this.routes[0]; // Compare against best/first route
        if (!current || route === current) return '';

        const getCost = (c: any) => typeof c === 'number' ? c : (c?.min || 0);

        const costDiff = getCost(route.totalCost) - getCost(current.totalCost);
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
        this.updateMapData();
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
                        this.selectedRouteIndex = 0; // Default to recommended (Index 0)

                        // Post-process instructions for all routes
                        this.routes.forEach(r => {
                            if (!r) return;
                            r.instructions = (r.instructions || [])
                                .filter(i => !!i);

                            if (r.instructions.length === 0) {
                                // CRITICAL FIX: Ensure segments is an array
                                const segments = Array.isArray(r.segments) ? r.segments : [];
                                r.instructions = segments
                                    .map((s: any) => s?.instruction || s?.instructions || '')
                                    .filter((i: any) => !!i);
                            }
                        });

                        // Hybrid Intelligence Separation
                        if (this.routes.length > 0) {
                            this.recommendedRoute = this.routes[0];
                            this.alternativeRoutes = this.routes.slice(1);
                        }

                        this.updateMapData();

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
     * Get strategy badge text (e.g. "Via North Gate")
     */
    getStrategyBadge(route: AlongRoute): string | null {
        if (!route.metadata?.strategy) return null;

        const strategy = route.metadata.strategy;

        if (strategy.startsWith('EXIT_VIA_')) {
            return `Via ${strategy.replace('EXIT_VIA_', '').replace(/_/g, ' ')}`;
        }

        return null;
    }

    /**
     * Safely extract mode/vehicle type as string from segment
     */
    getSegmentMode(segment: AlongSegment): string {
        if (!segment) return 'unknown';

        // 1. Identify raw values
        let mode = segment.vehicleType || (segment as any).mode;
        let type = segment.type;

        // 2. Resolve if values are objects (Backend V3/V4 consistency)
        const extract = (val: any) => {
            if (typeof val === 'object' && val !== null) {
                return val.type || val.name || val.id || '';
            }
            return val || '';
        };

        const resolvedMode = extract(mode).toLowerCase();
        const resolvedType = extract(type).toLowerCase();

        // 3. Selective Fallback Priority
        // We prefer specific vehicle names first, then segment types
        const result = resolvedMode || resolvedType || 'unknown';

        return result.toString();
    }

    /**
     * Safely extract display name for a stop or location
     */
    getStopName(stop: any): string {
        if (!stop) return 'Unknown Point';
        if (typeof stop === 'string') return stop;
        if (typeof stop === 'object') {
            return stop.name || stop.stopName || stop.locality || 'Unknown Stop';
        }
        return 'Unknown Stop';
    }


    /**
     * Get segment emoji based on type
     */
    getSegmentEmoji(segment: AlongSegment): string {
        const identifier = this.getSegmentMode(segment).toLowerCase();

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
        const identifier = this.getSegmentMode(segment).toLowerCase();

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
     * Format cost value safely (Handles single number or {min, max})
     */
    formatCost(cost: any): string {
        if (cost === null || cost === undefined) return '0';

        // Handle { min, max } object (Street Economics)
        if (typeof cost === 'object' && (cost.min !== undefined || cost.max !== undefined)) {
            const min = cost.min ?? 0;
            const max = cost.max ?? 0;
            if (min === max) return min.toString();
            return `${min} - ${max}`;
        }

        if (typeof cost === 'number') return cost.toString();
        if (typeof cost === 'string') return cost;

        // Legacy object support
        if (typeof cost === 'object') {
            return (cost.amount || cost.value || cost.total || '0').toString();
        }
        return '0';
    }

    /**
     * Get cost display string
     */
    getCostDisplay(): string {
        if (!this.route) return '₦0';

        const cost = this.route.totalCost;

        if (typeof cost === 'object' && cost !== null) {
            if (cost.min === cost.max) return `₦${cost.min}`;
            return `₦${cost.min} - ₦${cost.max}`;
        }

        return `₦${this.formatCost(cost)}`;
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
    async startJourney() {
        if (!this.route || !this.fromLocation || !this.toLocation) return;
        if (this.isStartingJourney) return;

        this.isStartingJourney = true;

        try {
            // Convert AlongRoute to GeneratedRoute format for orchestrator
            const generatedRoute = {
                id: (this.route as any).id || `route-${Date.now()}`,
                segments: this.route.segments.map((seg, i) => {
                    const modeStr = this.getSegmentMode(seg);
                    return {
                        id: `seg-${i}`,
                        distance: seg.distance || 0,
                        estimatedTime: seg.estimatedTime || 0,
                        mode: {
                            type: modeStr.toLowerCase(),
                            name: modeStr.charAt(0).toUpperCase() + modeStr.slice(1),
                            availabilityFactor: 1
                        },
                        cost: typeof seg.cost === 'number' ? seg.cost : (seg.cost as any)?.min || 0,
                        instructions: seg.instruction || seg.instructions || '',
                        fromStop: {
                            name: (seg.fromStop as any)?.name || 'Start',
                            latitude: (seg.fromStop as any)?.latitude || this.fromLocation!.lat,
                            longitude: (seg.fromStop as any)?.longitude || this.fromLocation!.lng
                        },
                        toStop: {
                            name: (seg.toStop as any)?.name || 'End',
                            latitude: (seg.toStop as any)?.latitude || this.toLocation!.lat,
                            longitude: (seg.toStop as any)?.longitude || this.toLocation!.lng
                        }
                    };
                }),
                totalDistance: this.route.totalDistance || 0,
                totalTime: this.route.totalTime || 0,
                totalCost: typeof this.route.totalCost === 'number' ? this.route.totalCost : (this.route.totalCost as any)?.min || 0,
                rankingScore: { shortest: 50, cheapest: 50, balanced: 50 },
                generatedAt: new Date(),
                strategy: 'balanced' as const
            };

            // Create trip in orchestrator
            const tripId = await this.orchestrator.createTrip(
                { latitude: this.fromLocation.lat, longitude: this.fromLocation.lng },
                { latitude: this.toLocation.lat, longitude: this.toLocation.lng },
                generatedRoute as any
            );

            // Start the trip
            await this.orchestrator.startTrip(tripId);

            // Navigate to trip tracking
            this.router.navigate(['/trip-tracking']);
        } catch (error) {
            console.error('[RouteDisplay] Failed to start journey:', error);
            alert('Failed to start journey. Please try again.');
        } finally {
            this.isStartingJourney = false;
        }
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
        console.log('[RouteDisplay] Opening Submit Price for segment:', segment);
        this.submitData = {
            from: this.getStopName(segment.fromStop),
            to: this.getStopName(segment.toStop),
            mode: this.getSegmentMode(segment).toLowerCase() || 'keke',
            fromId: segment.fromStopId || (segment as any).fromId || (segment.fromStop as any)?.id || 'UNKNOWN_STOP',
            toId: segment.toStopId || (segment as any).toId || (segment.toStop as any)?.id || 'UNKNOWN_STOP',
            distance: segment.distance || 0,
            estimatedTime: segment.estimatedTime || 0
        };
        console.log('[RouteDisplay] Prepared submitData:', this.submitData);
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

        // Extract names safely to avoid passing objects to the service
        const fromName = typeof segment.fromStop === 'object' ? (segment.fromStop as any).name : segment.fromStop;
        const toName = typeof segment.toStop === 'object' ? (segment.toStop as any).name : segment.toStop;

        // Check if there is a protocol for this hub and destination
        const result = this.protocolService.getProtocolForDestination(
            fromName,
            toName || ''
        );

        return result ? result.protocol : null;
    }

    /**
     * Get security status for a segment
     */
    getSecurityInfo(segment: AlongSegment) {
        // Look for security profile in hydrated stop data
        const fromStop = segment.fromStop as any;
        const toStop = segment.toStop as any;

        const risk = fromStop?.securityProfile?.riskLevel || toStop?.securityProfile?.riskLevel || 'LOW';
        const advice = fromStop?.securityProfile?.safetyAdvice || toStop?.securityProfile?.safetyAdvice;
        const threats = [...(fromStop?.securityProfile?.threats || []), ...(toStop?.securityProfile?.threats || [])];

        return {
            risk,
            advice,
            threats: [...new Set(threats)] // Unique threats
        };
    }

    getRiskLabel(risk: string): string {
        const r = (risk || '').toUpperCase();
        switch (r) {
            case 'HIGH_RISK':
            case 'HIGH':
                return '🚨 High Risk';
            case 'CAUTION':
            case 'MEDIUM':
            case 'MODERATE':
            case 'YELLOW':
                return '⚠️ Caution';
            case 'SAFE':
            case 'SAFE_ZONE':
            case 'SECURE':
            case 'LOW':
                return '🛡️ Safe Zone';
            default:
                return '🛡️ Safe Zone';
        }
    }

    /**
     * Get Boarding Strength information for a segment's start point
     */
    getBoardingStrengthInfo(segment: AlongSegment) {
        const fromStop = segment.fromStop as any;
        if (!fromStop || !fromStop.boardingProfile) return null;

        const mode = this.getSegmentMode(segment).toLowerCase();
        const strength = fromStop.boardingProfile[mode];

        if (!strength) return null;

        return {
            strength: strength.toLowerCase(),
            isMajorHub: strength.toLowerCase() === 'strong',
            isWeak: strength.toLowerCase() === 'weak',
            backboneName: fromStop.backboneName || 'Major Hub'
        };
    }

    /**
     * COMMUNITY INTELLIGENCE REPORTING
     */
    openReporting(segment: AlongSegment) {
        this.currentReportingSegment = segment;
        this.showReportingModal = true;

        // Default values
        this.reportType = 'fare';
        this.reportValue = {
            fare: null,
            waitTime: 'medium',
            riskAlert: '',
            stopAlias: ''
        };
    }

    closeReporting() {
        this.showReportingModal = false;
        this.currentReportingSegment = null;
    }

    submitCommunityReport() {
        if (!this.currentReportingSegment || !this.communityService.canReport()) {
            if (!this.communityService.canReport()) {
                alert('Please wait before submitting another report.');
            }
            return;
        }

        this.isSubmittingReport = true;

        const report: CommunityReport = {
            type: this.reportType,
            location: {
                lat: (this.currentReportingSegment.fromStop as any)?.latitude || 0,
                lng: (this.currentReportingSegment.fromStop as any)?.longitude || 0
            },
            stopId: this.currentReportingSegment.fromStopId || (this.currentReportingSegment as any).fromId,
            timestamp: new Date()
        };

        // Add type-specific data
        if (this.reportType === 'fare') report.fare = this.reportValue.fare;
        if (this.reportType === 'wait_time') report.waitTime = this.reportValue.waitTime;
        if (this.reportType === 'risk_alert') report.riskAlert = this.reportValue.riskAlert;
        if (this.reportType === 'stop_alias') report.stopAlias = this.reportValue.stopAlias;

        this.communityService.submitReport(report).subscribe({
            next: (res) => {
                if (res.success) {
                    this.communityService.logReportSubmission();
                    alert('Thanks! Your report helps keep the community informed.');
                    this.closeReporting();
                } else {
                    alert(res.message || 'Failed to submit report.');
                }
                this.isSubmittingReport = false;
            },
            error: (err) => {
                console.error('Reporting error:', err);
                alert('Failed to submit report. Please try again.');
                this.isSubmittingReport = false;
            }
        });
    }

    getDynamicBadge(adj?: IDynamicAdjustment) {
        if (!adj) return null;

        if (adj.fareMultiplier > 1.2) return { label: 'Surge: +₦' + Math.round((adj.fareMultiplier - 1) * 200), type: 'fare' };
        if (adj.waitMultiplier > 1.5) return { label: 'Long Wait Time', type: 'wait' };
        if (adj.riskBoost > 0) return { label: 'Security Alert', type: 'risk' };
        if (adj.congestionPenalty > 0) return { label: 'Heavy Traffic', type: 'traffic' };

        return null;
    }
}
