import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StressMeterComponent } from '../stress-meter/stress-meter.component';
import { NairaPipe } from '../../pipes/naira.pipe';
import { DurationPipe } from '../../pipes/duration.pipe';
import { TRANSPORT_ICONS } from '../../constants/transport-icons';

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
    intermediateStops?: { id: string; name: string }[];
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
}

/**
 * RouteOptionComponent - Route Option Card
 * Displays a single route option with stress meter, cost, time, and transport modes
 */
@Component({
    selector: 'app-route-option',
    standalone: true,
    imports: [CommonModule, StressMeterComponent, NairaPipe, DurationPipe],
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
        switch (this.route.classification) {
            case 'FASTEST': return '⚡ Fastest';
            case 'CHEAPEST': return '💰 Cheapest';
            default: return '⚖️ Balanced';
        }
    }

    getBadgeClass(): string {
        return this.route.classification.toLowerCase();
    }

    onSelect(): void {
        this.select.emit(this.route);
    }

    onViewDetails(): void {
        this.viewDetails.emit(this.route);
    }
}
