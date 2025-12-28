/**
 * Gamification Service - Signal-based State Management
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserContribution, LeaderboardResponse } from '../../models/crowdsourcing.model';

@Injectable({
    providedIn: 'root'
})
export class GamificationService {
    private readonly API_URL = `${environment.apiUrl}/users`;
    private readonly LEADERBOARD_URL = `${environment.apiUrl}/leaderboard`;

    // ═══════════════════════════════════════════════════════════════
    // STATE - Angular Signals
    // ═══════════════════════════════════════════════════════════════

    /** Current user's points and contribution stats */
    readonly userPoints = signal<UserContribution | null>(null);

    /** Computed: Current level based on points */
    readonly userLevel = computed(() => {
        const points = this.userPoints()?.totalPoints || 0;
        return this.calculateLevel(points);
    });

    /** Computed: Progress to next level */
    readonly nextLevelProgress = computed(() => {
        const points = this.userPoints()?.totalPoints || 0;
        return this.getPointsToNextLevel(points);
    });

    constructor(private http: HttpClient) { }

    // ═══════════════════════════════════════════════════════════════
    // API METHODS
    // ═══════════════════════════════════════════════════════════════

    getUserPoints(userId: string): Observable<{ success: boolean; data: UserContribution }> {
        return this.http.get<any>(`${this.API_URL}/${userId}/points`).pipe(
            tap(response => {
                if (response.success) {
                    this.userPoints.set(response.data);
                }
            })
        );
    }

    refreshUserPoints(userId: string): void {
        this.getUserPoints(userId).subscribe();
    }

    getLeaderboard(period: 'week' | 'month' | 'all' = 'week', limit: number = 50): Observable<{ success: boolean; data: LeaderboardResponse }> {
        return this.http.get<any>(this.LEADERBOARD_URL, {
            params: { period, limit: limit.toString() }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    calculateLevel(points: number): { level: number; levelName: string } {
        if (points >= 5000) return { level: 4, levelName: 'Diamond Local Expert' };
        if (points >= 1000) return { level: 3, levelName: 'Gold Route Master' };
        if (points >= 500) return { level: 2, levelName: 'Silver Navigator' };
        if (points >= 100) return { level: 1, levelName: 'Bronze Commuter' };
        return { level: 0, levelName: 'Newcomer' };
    }

    getPointsToNextLevel(currentPoints: number): { nextLevel: string; pointsNeeded: number } {
        const thresholds = [
            { points: 100, name: 'Bronze Commuter' },
            { points: 500, name: 'Silver Navigator' },
            { points: 1000, name: 'Gold Route Master' },
            { points: 5000, name: 'Diamond Local Expert' }
        ];

        for (const threshold of thresholds) {
            if (currentPoints < threshold.points) {
                return {
                    nextLevel: threshold.name,
                    pointsNeeded: threshold.points - currentPoints
                };
            }
        }

        return { nextLevel: 'Max Level', pointsNeeded: 0 };
    }

    getBadgeIcon(badgeName: string): string {
        const icons: { [key: string]: string } = {
            'Bronze Commuter': '🥉',
            'Silver Navigator': '🥈',
            'Gold Route Master': '🥇',
            'Diamond Local Expert': '💎',
            'First Contribution': '🎯',
            'Price Reporter': '💰',
            'Safety Guardian': '🛡️',
            'Protocol Master': '📍',
            'Photo Contributor': '📸',
            'Community Helper': '🤝'
        };
        return icons[badgeName] || '🏅';
    }

    showPointsEarned(points: number): void {
        console.log(`+${points} points earned!`);
    }
}
