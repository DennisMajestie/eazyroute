import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRank } from '../../../models/crowdsourcing.model';
import { GamificationService } from '../../../core/services/gamification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-leaderboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './leaderboard.component.html',
    styleUrl: './leaderboard.component.scss'
})
export class LeaderboardComponent implements OnInit {
    period: 'week' | 'month' | 'all' = 'week';
    leaderboard: UserRank[] = [];
    userRank: number = 0;
    currentUserId: string = '';
    isLoading = true;

    constructor(
        private gamificationService: GamificationService,
        private authService: AuthService
    ) {
        const user = this.authService.getUserValue();
        this.currentUserId = user?._id || '';
    }

    async ngOnInit() {
        await this.loadLeaderboard();
    }

    async loadLeaderboard() {
        this.isLoading = true;
        try {
            const response = await this.gamificationService.getLeaderboard(this.period).toPromise();
            if (response?.success) {
                this.leaderboard = response.data.leaderboard;
                this.userRank = response.data.userRank;
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async changePeriod(period: 'week' | 'month' | 'all') {
        this.period = period;
        await this.loadLeaderboard();
    }

    getMedal(index: number): string {
        return ['🥇', '🥈', '🥉'][index] || '';
    }

    isCurrentUser(userId: string): boolean {
        return userId === this.currentUserId;
    }
}
