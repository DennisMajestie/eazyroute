import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-skeleton-corridor',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './skeleton-corridor.component.html',
    styleUrls: ['./skeleton-corridor.component.scss']
})
export class SkeletonCorridorComponent {
    @Input() count: number = 2;
    @Input() animation: 'pulse' | 'wave' | 'shimmer' = 'wave';

    get skeletonArray(): number[] {
        return Array(this.count).fill(0).map((_, i) => i);
    }
}
