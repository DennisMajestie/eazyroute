import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Territory } from '../../../models/area.model';

@Component({
    selector: 'app-state-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './state-card.component.html',
    styleUrls: ['./state-card.component.scss']
})
export class StateCardComponent {
    @Input() territory!: Territory;
    @Input() selectable: boolean = true;
    @Output() selected = new EventEmitter<Territory>();

    onSelect() {
        if (this.selectable) {
            this.selected.emit(this.territory);
        }
    }

    getStateEmoji(): string {
        const emojiMap: { [key: string]: string } = {
            'Lagos State': '🏙️',
            'Federal Capital Territory': '🏛️',
            'Kano State': '🕌',
            'Rivers State': '🌊',
            'Oyo State': '👑',
            'Delta State': '⛽',
            'Kaduna State': '🏭',
            'Anambra State': '💼',
            'Enugu State': '⛰️',
            'Plateau State': '🏔️'
        };
        return emojiMap[this.territory.name] || '📍';
    }
}
