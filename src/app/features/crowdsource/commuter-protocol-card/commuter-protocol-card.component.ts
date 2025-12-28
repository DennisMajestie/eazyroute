import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommuterProtocol } from '../../../models/crowdsourcing.model';
import { ContributionService } from '../../../core/services/contribution.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';

@Component({
    selector: 'app-commuter-protocol-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './commuter-protocol-card.component.html',
    styleUrl: './commuter-protocol-card.component.scss'
})
export class CommuterProtocolCardComponent {
    @Input() protocol!: CommuterProtocol;

    hasVoted = false;

    constructor(
        private contributionService: ContributionService,
        private toastService: ToastNotificationService
    ) { }

    async upvote() {
        if (this.hasVoted || !this.protocol._id) return;

        try {
            await this.contributionService.voteOnContribution(
                this.protocol._id,
                'protocol',
                'up'
            ).toPromise();

            this.protocol.upvotes++;
            this.hasVoted = true;

            this.toastService.show(
                'Vote Recorded',
                'Thanks for helping the community!',
                'success',
                2000
            );
        } catch (error) {
            console.error('Vote failed:', error);
        }
    }

    async report() {
        const reason = prompt('Why are you reporting this protocol?');
        if (!reason || !this.protocol._id) return;

        try {
            await this.contributionService.reportContribution(
                this.protocol._id,
                'protocol',
                reason
            ).toPromise();

            this.toastService.show(
                'Report Submitted',
                'We\'ll review this content. Thanks!',
                'info',
                3000
            );
        } catch (error) {
            console.error('Report failed:', error);
        }
    }
}
