import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouteSegmentService } from '../../../core/services/route-segment.service';

@Component({
    selector: 'app-submit-price',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './submit-price.component.html',
    styleUrls: ['./submit-price.component.scss']
})
export class SubmitPriceComponent {
    @Input() fromStopName: string = '';
    @Input() toStopName: string = '';
    @Input() transportMode: string = 'keke';
    @Input() distance: number = 0;

    // In a real app, we'd need IDs. For MVP, we might search or accept names if backend allows.
    // Assuming we might need to resolve these, but for now we'll pass strings/dummy IDs if not provided.
    @Input() fromStopId: string = 'UNKNOWN_STOP';
    @Input() toStopId: string = 'UNKNOWN_STOP';
    @Input() estimatedTime: number | null = null;

    @Output() close = new EventEmitter<void>();
    @Output() submitted = new EventEmitter<void>();

    priceMin: number | null = null;
    priceMax: number | null = null;

    isSubmitting = false;
    error = '';
    success = false;

    constructor(private routeSegmentService: RouteSegmentService) { }

    submit() {
        if (!this.priceMin || !this.estimatedTime) {
            this.error = 'Please fill in price and time.';
            return;
        }

        this.isSubmitting = true;
        this.error = '';

        const payload = {
            fromStopId: this.fromStopId,
            toStopId: this.toStopId,
            transportMode: this.transportMode,
            priceRange: {
                min: this.priceMin,
                max: this.priceMax || this.priceMin
            },
            estimatedTime: this.estimatedTime,
            distance: this.distance
        };

        console.log('[SubmitPrice] Sending Community Submission:', payload);

        if (payload.fromStopId === 'UNKNOWN_STOP' || payload.toStopId === 'UNKNOWN_STOP') {
            this.error = 'Cannot submit price info for locations not in our database. Please select a known stop.';
            this.isSubmitting = false;
            return;
        }

        if (!payload.distance || payload.distance <= 0) {
            console.warn('[SubmitPrice] Warning: Distance is missing or 0. Backend might reject this.');
        }

        this.routeSegmentService.submitCommunitySegment(payload).subscribe({
            next: () => {
                this.success = true;
                this.isSubmitting = false;
                setTimeout(() => {
                    this.submitted.emit();
                    this.close.emit();
                }, 1500);
            },
            error: (err) => {
                const message = err.error?.message || err.message || 'Failed to submit. Try again.';
                this.error = message;
                if (err.status === 404) this.error = 'Selected stop not found in system. Please refresh.';
                if (err.status === 400) this.error = 'Invalid data provided. Please check price and time.';
                this.isSubmitting = false;
            }
        });
    }

    onClose() {
        this.close.emit();
    }
}
