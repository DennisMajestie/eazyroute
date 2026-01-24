/**
 * Route Builder Service
 * 
 * Builds complete routes from segments with ranking and scoring
 * Extracted from route-generation.engine.ts
 */

import { Injectable } from '@angular/core';
import {
    GeneratedRoute,
    RouteSegment
} from '../types/easyroute.types';

export type RouteStrategy = 'shortest' | 'cheapest' | 'balanced' | 'custom';

@Injectable({
    providedIn: 'root'
})
export class RouteBuilderService {

    // ═══════════════════════════════════════════════════════════════
    // ROUTE BUILDING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Build a GeneratedRoute from segments
     */
    buildRoute(segments: RouteSegment[], strategy: RouteStrategy): GeneratedRoute {
        const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
        const totalTime = segments.reduce((sum, s) => sum + s.estimatedTime, 0);
        const totalCost = segments.reduce((sum, s) => sum + s.cost, 0);

        const route: GeneratedRoute = {
            id: this.generateRouteId(),
            segments,
            totalDistance,
            totalTime,
            totalCost,
            rankingScore: {
                shortest: 0,
                cheapest: 0,
                balanced: 0
            },
            generatedAt: new Date(),
            strategy
        };

        // Calculate initial ranking scores
        this.calculateRankingScores(route);

        return route;
    }

    /**
     * Build a direct route (single segment, no stops)
     */
    buildDirectRoute(segment: RouteSegment, suggestion?: string): GeneratedRoute {
        const route = this.buildRoute([segment], 'balanced');
        route.suggestion = suggestion || 'Direct route - no transit stops found';
        return route;
    }

    // ═══════════════════════════════════════════════════════════════
    // RANKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate ranking scores for a single route
     */
    calculateRankingScores(route: GeneratedRoute): void {
        // Base scores (will be normalized when comparing multiple routes)
        route.rankingScore = {
            shortest: 100 - Math.min(route.totalTime / 2, 100),
            cheapest: 100 - Math.min(route.totalCost / 20, 100),
            balanced: this.calculateBalancedScore(route)
        };
    }

    /**
     * Rank multiple routes and assign normalized scores
     */
    rankRoutes(routes: GeneratedRoute[]): GeneratedRoute[] {
        const safeRoutes = Array.isArray(routes) ? routes.filter(r => !!r) : [];
        if (safeRoutes.length === 0) return [];
        if (safeRoutes.length === 1) {
            this.calculateRankingScores(safeRoutes[0]);
            return safeRoutes;
        }

        const times = safeRoutes.map(r => r.totalTime || 0);
        const costs = safeRoutes.map(r => r.totalCost || 0);

        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);

        // Calculate normalized scores
        for (const route of routes) {
            route.rankingScore = {
                shortest: this.inverseNormalize(route.totalTime, minTime, maxTime),
                cheapest: this.inverseNormalize(route.totalCost, minCost, maxCost),
                balanced: 0
            };

            route.rankingScore.balanced =
                (route.rankingScore.shortest * 0.6) +
                (route.rankingScore.cheapest * 0.4);
        }

        // Sort by balanced score (highest first)
        return routes.sort((a, b) => b.rankingScore.balanced - a.rankingScore.balanced);
    }

    /**
     * Calculate balanced score
     */
    private calculateBalancedScore(route: GeneratedRoute): number {
        const timeScore = 100 - Math.min(route.totalTime / 2, 100);
        const costScore = 100 - Math.min(route.totalCost / 20, 100);
        return (timeScore * 0.6) + (costScore * 0.4);
    }

    /**
     * Inverse normalization: lower values = higher scores
     */
    private inverseNormalize(value: number, min: number, max: number): number {
        if (max === min) return 100;
        return Math.round(100 * (1 - (value - min) / (max - min)));
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate unique route ID
     */
    private generateRouteId(): string {
        return `route_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Merge two routes (useful for multi-stop journeys)
     */
    mergeRoutes(route1: GeneratedRoute, route2: GeneratedRoute): GeneratedRoute {
        const segments = [...route1.segments, ...route2.segments];
        return this.buildRoute(segments, 'custom');
    }

    /**
     * Clone a route with new ID
     */
    cloneRoute(route: GeneratedRoute): GeneratedRoute {
        return {
            ...route,
            id: this.generateRouteId(),
            segments: [...route.segments],
            rankingScore: { ...route.rankingScore },
            generatedAt: new Date()
        };
    }

    /**
     * Get route summary string
     */
    formatRouteSummary(route: GeneratedRoute): string {
        const stops = route.segments.length + 1;
        return `${route.totalTime}min | ₦${route.totalCost} | ${stops} stops`;
    }

    /**
     * Get detailed route description
     */
    formatRouteDescription(route: GeneratedRoute): string[] {
        return route.segments.map((s, i) =>
            `${i + 1}. ${s.mode.name}: ${s.fromStop.name} → ${s.toStop.name} (${s.estimatedTime}min, ₦${s.cost})`
        );
    }
}
