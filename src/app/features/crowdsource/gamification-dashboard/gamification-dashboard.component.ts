import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserContribution } from '../../../models/crowdsourcing.model';
import { GamificationService } from '../../../core/services/gamification.service';

@Component({
    selector: 'app-gamification-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './gamification-dashboard.component.html',
    styleUrl: './gamification-dashboard.component.scss'
})
export class GamificationDashboardComponent implements OnInit {
    @Input() userId: string = '';

    userStats: UserContribution | null = null;
    progressToNextLevel: number = 0;
    isLoading = true;

    constructor(private gamificationService: GamificationService) { }

    async ngOnInit() {
        await this.loadUserStats();
    }

    async loadUserStats() {
        this.isLoading = true;
        try {
            const response = await this.gamificationService.getUserPoints(this.userId).toPromise();
            if (response?.success) {
                this.userStats = response.data;
                this.calculateProgress();
            }
        } catch (error) {
            console.error('Failed to load user stats:', error);
        } finally {
            this.isLoading = false;
        }
    }

    calculateProgress() {
        if (!this.userStats) return;

        const current = this.userStats.totalPoints;
        const needed = this.userStats.nextBadge.pointsNeeded;

        if (needed === 0) {
            this.progressToNextLevel = 100;
        } else {
            const total = current + needed;
            this.progressToNextLevel = (current / total) * 100;
        }
    }

    getLevelIcon(level: number): string {
        const icons = ['🥉', '🥈', '🥇', '💎'];
        return icons[level] || '🏅';
    }

    getLevelClass(level: number): string {
        const classes = ['bronze', 'silver', 'gold', 'diamond'];
        return classes[level] || 'bronze';
    }
}
