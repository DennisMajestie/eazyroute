import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-skeleton-landmark',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './skeleton-landmark.component.html',
    styleUrls: ['./skeleton-landmark.component.scss']
})
export class SkeletonLandmarkComponent {
    @Input() count: number = 3;
    @Input() animation: 'pulse' | 'wave' = 'pulse';

    get skeletonArray(): number[] {
        return Array(this.count).fill(0).map((_, i) => i);
    }
}
