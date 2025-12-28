import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContributionService } from '../../../core/services/contribution.service';
import { GamificationService } from '../../../core/services/gamification.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';

@Component({
    selector: 'app-after-trip-survey',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './after-trip-survey.component.html',
    styleUrl: './after-trip-survey.component.scss'
})
export class AfterTripSurveyComponent implements OnInit {
    @Input() tripId: string = '';
    @Input() routeSegmentId: string = '';
    @Input() show: boolean = false;
    @Output() onComplete = new EventEmitter<any>();

    feedback = {
        pricePaid: null as number | null,
        traffic: 'moderate' as 'light' | 'moderate' | 'heavy' | 'extreme',
        safetyRating: 4,
        tip: ''
    };

    pointsToEarn = 10;
    pointsEarned = 0;
    showSuccess = false;
    isSubmitting = false;

    constructor(
        private contributionService: ContributionService,
        private gamificationService: GamificationService,
        private toastService: ToastNotificationService
    ) { }

    ngOnInit() {
        this.calculatePoints();
    }

    calculatePoints(): number {
        let points = 10; // Base points for pricing
        if (this.feedback.tip && this.feedback.tip.length > 20) {
            points += 5; // Bonus for detailed tip
        }
        this.pointsToEarn = points;
        return points;
    }

    isValid(): boolean {
        return this.feedback.pricePaid !== null && this.feedback.pricePaid > 0;
    }

    async submit() {
        if (!this.isValid() || this.isSubmitting) return;

        this.isSubmitting = true;

        try {
            const response = await this.contributionService.submitPricingFeedback({
                routeSegmentId: this.routeSegmentId,
                pricePaid: this.feedback.pricePaid!,
                timeOfDay: new Date().toTimeString().slice(0, 5),
                conditions: {
                    weather: 'clear', // TODO: Get from weather API
                    traffic: this.feedback.traffic,
                    wasSurge: false
                }
            }).toPromise();

            if (response?.success) {
                this.pointsEarned = response.data.pointsEarned;
                this.showSuccess = true;

                // Show toast notification
                this.toastService.show(
                    'Points Earned!',
                    `+${this.pointsEarned} points for your contribution`,
                    'success',
                    3000
                );

                // Refresh user points
                // this.gamificationService.refreshUserPoints(userId);

                setTimeout(() => {
                    this.onComplete.emit(response.data);
                    this.show = false;
                    this.reset();
                }, 2000);
            }
        } catch (error) {
            console.error('Survey submission failed:', error);
            this.toastService.show(
                'Submission Failed',
                'Could not submit your feedback. Please try again.',
                'error',
                3000
            );
        } finally {
            this.isSubmitting = false;
        }
    }

    skip() {
        this.show = false;
        this.onComplete.emit(null);
        this.reset();
    }

    reset() {
        this.feedback = {
            pricePaid: null,
            traffic: 'moderate',
            safetyRating: 4,
            tip: ''
        };
        this.showSuccess = false;
        this.pointsEarned = 0;
    }

    setSafetyRating(rating: number) {
        this.feedback.safetyRating = rating;
    }
}
