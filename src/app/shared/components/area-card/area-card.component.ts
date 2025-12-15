import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Area } from '../../../models/area.model';

@Component({
    selector: 'app-area-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './area-card.component.html',
    styleUrls: ['./area-card.component.scss']
})
export class AreaCardComponent {
    @Input() area!: Area;
    @Input() selectable: boolean = true;
    @Output() selected = new EventEmitter<Area>();

    onSelect() {
        if (this.selectable) {
            this.selected.emit(this.area);
        }
    }

    getTypeBadgeColor(): string {
        const colorMap: { [key: string]: string } = {
            'commercial': 'var(--primary)',
            'residential': 'var(--secondary)',
            'mixed': 'var(--accent)',
            'industrial': '#666'
        };
        return colorMap[this.area.type || 'mixed'] || 'var(--accent)';
    }

    getStatusBadgeColor(): string {
        const colorMap: { [key: string]: string } = {
            'active': 'var(--success)',
            'pending': 'var(--warning)',
            'unmapped': 'var(--text-tertiary)'
        };
        return colorMap[this.area.status || 'unmapped'] || 'var(--text-tertiary)';
    }
}
