import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-skeleton-walking-hint',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './skeleton-walking-hint.component.html',
    styleUrls: ['./skeleton-walking-hint.component.scss']
})
export class SkeletonWalkingHintComponent {
    @Input() count: number = 1;
}
