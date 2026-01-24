import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * StressMeterComponent - Hustle Index Display
 * Shows stress score from 0-100 with color-coded visual feedback
 */
@Component({
    selector: 'app-stress-meter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './stress-meter.component.html',
    styleUrl: './stress-meter.component.scss'
})
export class StressMeterComponent {
    @Input() set stressScore(value: number) {
        this.score.set(Math.max(0, Math.min(100, value || 0)));
    }

    @Input() showLabel = true;
    @Input() compact = false;

    score = signal(0);

    stressClass = computed(() => {
        const s = this.score();
        if (s <= 30) return 'cool';
        if (s <= 70) return 'hustle';
        return 'extreme';
    });

    stressIcon = computed(() => {
        const s = this.score();
        if (s <= 30) return '😎';
        if (s <= 70) return '😓';
        return '🔥';
    });

    stressLabel = computed(() => {
        const s = this.score();
        if (s <= 30) return 'Cool Ride';
        if (s <= 70) return 'Moderate Hustle';
        return 'Maximum Hustle!';
    });

    stressDescription = computed(() => {
        const s = this.score();
        if (s <= 30) return 'Smooth journey ahead';
        if (s <= 70) return 'Expect some movement';
        return 'Brace yourself!';
    });
}
