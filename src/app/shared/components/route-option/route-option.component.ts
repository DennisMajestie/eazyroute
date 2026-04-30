import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StressMeterComponent } from '../stress-meter/stress-meter.component';
import { NairaPipe } from '../../pipes/naira.pipe';
import { DurationPipe } from '../../pipes/duration.pipe';
import { TRANSPORT_ICONS } from '../../constants/transport-icons';
import { VerificationBadgeComponent } from '../verification-badge/verification-badge.component';

/**
 * Route leg interface
 */
export interface RouteLeg {
    fromName: string;
    toName: string;
    fromId: string;
    toId: string;
    mode: 'bus' | 'taxi' | 'keke' | 'okada' | 'walking';
    duration: number;
    distance: number;
    cost: number;
    instruction: string;
    isVerified?: boolean;
    intermediateStops?: { id: string; name: string }[];
    safetyData?: {
        riskLevel: 'safe' | 'caution' | 'high_risk';
        threats?: string[];
        advice?: string;
    };
}

/**
 * Route result interface
 */
export interface RouteResult {
    classification: 'FASTEST' | 'CHEAPEST' | 'BALANCED';
    rationale: string;
    legs: RouteLeg[];
    totalCost: { min: number; max: number };
    totalTime: number;
    totalDistance: number;
    metadata: {
        transferCount: number;
        stressScore: number;
        computeTimeMs: number;
        ribExitApplied: boolean;
        strategy: string;
    };
    warnings: string[];
    isVerified?: boolean;
}

/**
 * RouteOptionComponent - Route Option Card
 * Displays a single route option with stress meter, cost, time, and transport modes
 */
@Component({
    selector: 'app-route-option',
    standalone: true,
    imports: [CommonModule, StressMeterComponent, NairaPipe, DurationPipe, VerificationBadgeComponent],
    templateUrl: './route-option.component.html',
    styleUrl: './route-option.component.scss'
})
export class RouteOptionComponent {
    @Input({ required: true }) route!: RouteResult;
    @Input() selected = false;
    @Input() showDetails = false;
    @Output() select = new EventEmitter<RouteResult>();
    @Output() viewDetails = new EventEmitter<RouteResult>();

    getIcon(mode: string): string {
        return TRANSPORT_ICONS[mode?.toLowerCase()] || '🚗';
    }

    getBadgeLabel(): string {
        const c = (this.route.classification || '').toUpperCase();
        switch (c) {
            case 'FASTEST':
            case 'QUICKEST':
                return '⚡ Fastest';
            case 'CHEAPEST':
            case 'ECONOMY':
                return '💰 Cheapest';
            case 'BALANCED':
            case 'RECOMMENDED':
                return '⚖️ Balanced';
            case 'SAFE':
            case 'SECURE':
                return '🛡️ Safest';
            default:
                return '⚖️ Balanced';
        }
    }

    getBadgeClass(): string {
        const c = (this.route.classification || '').toUpperCase();
        switch (c) {
            case 'FASTEST': return 'fastest';
            case 'CHEAPEST': return 'cheapest';
            case 'SAFE': return 'safe';
            default: return 'balanced';
        }
    }

    onSelect(): void {
        this.select.emit(this.route);
    }

    onViewDetails(): void {
        this.viewDetails.emit(this.route);
    }

    getHighestRisk(): 'safe' | 'caution' | 'high_risk' | null {
        if (!this.route.legs) return null;

        const risks = this.route.legs
            .map(leg => (leg as any).safetyData?.riskLevel)
            .filter(risk => !!risk);

        if (risks.includes('high_risk')) return 'high_risk';
        if (risks.includes('caution')) return 'caution';
        if (risks.includes('safe')) return 'safe';
        return null;
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
                return '';
        }
    }
}
