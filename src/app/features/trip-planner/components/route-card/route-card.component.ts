import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneratedRoute } from '../../../../core/engines/types/easyroute.types';
import { StressMeterComponent } from '../../../../shared/components/stress-meter/stress-meter.component';

@Component({
    selector: 'app-route-card',
    standalone: true,
    imports: [CommonModule, StressMeterComponent],
    templateUrl: './route-card.component.html',
    styleUrls: ['./route-card.component.scss']
})
export class RouteCardComponent {
    @Input({ required: true }) route!: GeneratedRoute;
    @Input() selected = false;
    @Output() select = new EventEmitter<GeneratedRoute>();

    /**
     * Get the badge icon based on route classification
     */
    getBadgeIcon(): string {
        switch (this.route.classification) {
            case 'FASTEST':
                return '⚡';
            case 'CHEAPEST':
                return '💰';
            case 'BALANCED':
                return '⚖️';
            case 'RECOMMENDED':
                return '🎯';
            default:
                return '🗺️';
        }
    }

    /**
     * Get the badge label based on route classification
     */
    getBadgeLabel(): string {
        switch (this.route.classification) {
            case 'FASTEST':
                return 'Fastest';
            case 'CHEAPEST':
                return 'Cheapest';
            case 'BALANCED':
                return 'Balanced';
            case 'RECOMMENDED':
                return 'Recommended';
            default:
                return 'Route';
        }
    }

    /**
     * Get transport mode icon emoji
     */
    getTransportIcon(mode: string | undefined): string {
        if (!mode) return '🚗';
        const icons: Record<string, string> = {
            bus: '🚌',
            taxi: '🚖',
            keke: '🛺',
            okada: '🏍️',
            walking: '🚶',
            walk: '🚶'
        };
        return icons[mode.toLowerCase()] || '🚗';
    }

    /**
     * Format cost for display
     */
    formatCost(cost: number | { min: number; max: number } | undefined): string {
        if (!cost) return '0';
        if (typeof cost === 'number') {
            return cost.toLocaleString();
        }
        return `${cost.min.toLocaleString()}-${cost.max.toLocaleString()}`;
    }

    /**
     * Emit selection event
     */
    selectRoute(): void {
        this.select.emit(this.route);
    }
}
