import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NIGERIAN_COPY } from '../../constants/nigerian-copy.constants';

@Component({
    selector: 'app-loading-progress',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './loading-progress.component.html',
    styleUrls: ['./loading-progress.component.scss']
})
export class LoadingProgressComponent {
    @Input() progress: number = 0; // 0-100
    @Input() message: string = NIGERIAN_COPY.LOADING.SEARCHING;
    @Input() secondaryMessage?: string;
    @Input() showSteps: boolean = false;
    @Input() currentStep: number = 0;

    steps = [
        NIGERIAN_COPY.PROGRESS.FINDING_AREA,
        NIGERIAN_COPY.PROGRESS.CHECKING_CORRIDORS,
        NIGERIAN_COPY.PROGRESS.GETTING_BOARDING
    ];

    isStepComplete(index: number): boolean {
        return index < this.currentStep;
    }

    isStepActive(index: number): boolean {
        return index === this.currentStep;
    }
}
