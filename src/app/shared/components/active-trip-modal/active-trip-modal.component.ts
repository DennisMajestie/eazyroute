import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveTripPromptService } from '../../../core/services/active-trip-prompt.service';

@Component({
    selector: 'app-active-trip-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './active-trip-modal.component.html',
    styleUrls: ['./active-trip-modal.component.scss']
})
export class ActiveTripModalComponent {
    constructor(public promptService: ActiveTripPromptService) {}

    get activeTrip() {
        return this.promptService.activeTrip();
    }

    get destinationLabel(): string {
        const destination = this.activeTrip?.destination;
        return destination ? `Destination: ${destination}` : 'Destination information unavailable';
    }

    get startedAtLabel(): string {
        if (!this.activeTrip?.startedAt) {
            return 'Unknown start time';
        }

        const date = new Date(this.activeTrip.startedAt);
        return isNaN(date.getTime()) ? 'Unknown start time' : date.toLocaleString();
    }

    resume(): void {
        this.promptService.resolve('resume');
    }

    cancel(): void {
        this.promptService.resolve('cancel');
    }

    continue(): void {
        this.promptService.resolve('continue');
    }
}
