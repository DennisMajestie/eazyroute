import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommuterProtocol } from '../../../models/crowdsourcing.model';
import { ContributionService } from '../../../core/services/contribution.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';

@Component({
    selector: 'app-protocol-submission',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './protocol-submission.component.html',
    styleUrl: './protocol-submission.component.scss'
})
export class ProtocolSubmissionComponent {
    @Input() junctionId: string = '';
    @Input() junctionName: string = '';
    @Input() destinationId: string = '';
    @Input() destinationName: string = '';
    @Input() show: boolean = false;
    @Output() onComplete = new EventEmitter<any>();

    protocol: Partial<CommuterProtocol> = {
        location: '',
        shout: '',
        signal: '',
        insiderTip: '',
        avoidTime: '',
        typicalPrice: {
            along: undefined,
            drop: undefined
        }
    };

    selectedPhotos: File[] = [];
    isSubmitting = false;

    constructor(
        private contributionService: ContributionService,
        private toastService: ToastNotificationService
    ) { }

    onPhotoSelect(event: any) {
        const files = Array.from(event.target.files) as File[];
        this.selectedPhotos = files.slice(0, 3); // Max 3 photos
    }

    removePhoto(index: number) {
        this.selectedPhotos.splice(index, 1);
    }

    getPhotoUrl(file: File): string {
        return URL.createObjectURL(file);
    }

    isValid(): boolean {
        return !!(
            this.protocol.location &&
            this.protocol.shout &&
            this.protocol.location.length > 5 &&
            this.protocol.shout.length > 3
        );
    }

    async submit() {
        if (!this.isValid() || this.isSubmitting) return;

        this.isSubmitting = true;

        try {
            // TODO: Upload photos first if any
            const photoUrls: string[] = [];
            if (this.selectedPhotos.length > 0) {
                // photoUrls = await this.uploadPhotos(this.selectedPhotos);
            }

            const protocolData: Partial<CommuterProtocol> = {
                junctionId: this.junctionId,
                junction: this.junctionName,
                destinationId: this.destinationId,
                destination: this.destinationName,
                location: this.protocol.location,
                shout: this.protocol.shout,
                signal: this.protocol.signal,
                insiderTip: this.protocol.insiderTip,
                avoidTime: this.protocol.avoidTime,
                typicalPrice: this.protocol.typicalPrice,
                photos: photoUrls
            };

            const response = await this.contributionService.submitCommuterProtocol(protocolData).toPromise();

            if (response?.success) {
                this.toastService.show(
                    'Protocol Submitted!',
                    `+${response.data.pointsEarned} points earned`,
                    'success',
                    3000
                );

                this.onComplete.emit(response.data);
                this.reset();
                this.show = false;
            }
        } catch (error) {
            console.error('Protocol submission failed:', error);
            this.toastService.show(
                'Submission Failed',
                'Could not submit protocol. Please try again.',
                'error',
                3000
            );
        } finally {
            this.isSubmitting = false;
        }
    }

    cancel() {
        this.reset();
        this.show = false;
        this.onComplete.emit(null);
    }

    reset() {
        this.protocol = {
            location: '',
            shout: '',
            signal: '',
            insiderTip: '',
            avoidTime: '',
            typicalPrice: {
                along: undefined,
                drop: undefined
            }
        };
        this.selectedPhotos = [];
    }
}
