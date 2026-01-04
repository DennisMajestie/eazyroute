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

    // In a real app, we'd need IDs. For MVP, we might search or accept names if backend allows.
    // Assuming we might need to resolve these, but for now we'll pass strings/dummy IDs if not provided.
    @Input() fromStopId: string = 'UNKNOWN_STOP';
    @Input() toStopId: string = 'UNKNOWN_STOP';

    @Output() close = new EventEmitter<void>();
    @Output() submitted = new EventEmitter<void>();

    priceMin: number | null = null;
    priceMax: number | null = null;
    estimatedTime: number | null = null;

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
            estimatedTime: this.estimatedTime
        };

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
                this.error = err.error?.message || 'Failed to submit. Try again.';
                this.isSubmitting = false;
            }
        });
    }

    onClose() {
        this.close.emit();
    }
}
