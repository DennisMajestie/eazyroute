import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type RoutePreference = 'balance' | 'cost' | 'time' | 'comfort';

export interface PreferenceOption {
    type: RoutePreference;
    label: string;
    icon: string;
    description: string;
}

@Component({
    selector: 'app-route-preference-selector',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './route-preference-selector.component.html',
    styleUrls: ['./route-preference-selector.component.scss']
})
export class RoutePreferenceSelectorComponent {
    @Input() selected: RoutePreference = 'balance';
    @Output() selectionChange = new EventEmitter<RoutePreference>();

    readonly preferences: PreferenceOption[] = [
        {
            type: 'balance',
            label: 'Balanced',
            icon: '⚖️',
            description: 'Best mix of cost and time'
        },
        {
            type: 'time',
            label: 'Speed',
            icon: '⚡',
            description: 'Fastest route'
        },
        {
            type: 'cost',
            label: 'Budget',
            icon: '💰',
            description: 'Cheapest option'
        },
        {
            type: 'comfort',
            label: 'Comfort',
            icon: '🛴',
            description: 'Fewest transfers'
        }
    ];

    selectPreference(preference: RoutePreference): void {
        this.selected = preference;
        this.selectionChange.emit(preference);
    }
}
