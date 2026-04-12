import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';

@Component({
    selector: 'app-name-place-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './name-place-modal.component.html',
    styleUrls: ['./name-place-modal.component.scss']
})
export class NamePlaceModalComponent {
    @Input() isOpen = false;
    @Input() lat: number | null = null;
    @Input() lng: number | null = null;
    @Input() currentAddress = '';
    
    @Output() closed = new EventEmitter<boolean>();

    customName = '';
    isSubmitting = false;

    constructor(
        private geocodingService: GeocodingService,
        private toastService: ToastNotificationService
    ) {}

    onSubmit() {
        if (!this.customName || this.customName.trim().length < 3) {
            return;
        }

        if (this.lat === null || this.lng === null) {
            this.toastService.error('Error', 'Missing coordinates for location naming.');
            return;
        }

        this.isSubmitting = true;
        this.geocodingService.namePlace(this.customName.trim(), this.lat, this.lng).subscribe({
            next: (response: any) => {
                this.isSubmitting = false;
                if (response?.success) {
                    this.toastService.success('Thank you!', 'Suggestion submitted for review.');
                    this.closed.emit(true);
                    this.reset();
                } else {
                    this.toastService.error('Error', response?.message || 'Failed to submit name suggestion.');
                }
            },
            error: (err) => {
                this.isSubmitting = false;
                console.error('[NamePlaceModal] Submission error:', err);
                this.toastService.error('Error', 'Could not submit your suggestion. Please try again.');
            }
        });
    }

    onCancel() {
        this.closed.emit(false);
        this.reset();
    }

    private reset() {
        this.customName = '';
    }

    onBackdropClick(event: MouseEvent) {
        if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
            this.onCancel();
        }
    }
}
