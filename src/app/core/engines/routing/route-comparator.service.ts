/**
 * Route Comparator Service
 * 
 * Extracted from easyroute-orchestrator.engine.ts
 * Handles route comparison logic and ranking
 */

import { Injectable } from '@angular/core';
import { GeneratedRoute } from '../types/easyroute.types';

export interface RouteComparisonResult {
    routes: GeneratedRoute[];
    recommended: GeneratedRoute;
    comparisonFactors: {
        fastest: GeneratedRoute;
        cheapest: GeneratedRoute;
        mostBalanced: GeneratedRoute;
    };
}

export interface ComparisonWeights {
    time: number;
    cost: number;
    transfers?: number;
}

@Injectable({
    providedIn: 'root'
})
export class RouteComparatorService {

    private defaultWeights: ComparisonWeights = {
        time: 0.6,
        cost: 0.4,
        transfers: 0
    };

    /**
     * Compare multiple routes and identify the best options
     */
    compare(routes: GeneratedRoute[], weights?: ComparisonWeights): RouteComparisonResult {
        if (!routes || routes.length === 0) {
            throw new Error('No routes to compare');
        }

        const effectiveWeights = { ...this.defaultWeights, ...weights };

        const fastest = this.findFastest(routes);
        const cheapest = this.findCheapest(routes);
        const mostBalanced = this.findMostBalanced(routes, effectiveWeights);

        return {
            routes,
            recommended: mostBalanced,
            comparisonFactors: {
                fastest,
                cheapest,
                mostBalanced
            }
        };
    }

    /**
     * Find the fastest route
     */
    findFastest(routes: GeneratedRoute[]): GeneratedRoute {
        return routes.reduce((min, route) =>
            route.totalTime < min.totalTime ? route : min
        );
    }

    /**
     * Find the cheapest route
     */
    findCheapest(routes: GeneratedRoute[]): GeneratedRoute {
        return routes.reduce((min, route) =>
            route.totalCost < min.totalCost ? route : min
        );
    }

    /**
     * Find the most balanced route based on weighted scoring
     */
    findMostBalanced(routes: GeneratedRoute[], weights: ComparisonWeights): GeneratedRoute {
        return routes.reduce((best, route) => {
            const currentScore = this.calculateScore(route, weights);
            const bestScore = this.calculateScore(best, weights);
            return currentScore > bestScore ? route : best;
        });
    }

    /**
     * Calculate a weighted score for route ranking
     * Higher score = better overall value
     */
    calculateScore(route: GeneratedRoute, weights?: ComparisonWeights): number {
        const w = weights || this.defaultWeights;

        // Normalize values (0-100 scale)
        const timeScore = 100 - Math.min(route.totalTime / 2, 100);
        const costScore = 100 - Math.min(route.totalCost / 20, 100);

        // Weighted average
        return (timeScore * w.time) + (costScore * w.cost);
    }

    /**
     * Rank routes by score (highest first)
     */
    rank(routes: GeneratedRoute[], weights?: ComparisonWeights): GeneratedRoute[] {
        const w = weights || this.defaultWeights;
        return [...routes].sort((a, b) =>
            this.calculateScore(b, w) - this.calculateScore(a, w)
        );
    }

    /**
     * Get route statistics for comparison display
     */
    getStats(routes: GeneratedRoute[]): {
        minTime: number;
        maxTime: number;
        minCost: number;
        maxCost: number;
        avgTime: number;
        avgCost: number;
    } {
        const safeRoutes = Array.isArray(routes) ? routes.filter(r => !!r) : [];
        if (safeRoutes.length === 0) {
            return { minTime: 0, maxTime: 0, minCost: 0, maxCost: 0, avgTime: 0, avgCost: 0 };
        }

        const times = safeRoutes.map(r => r.totalTime || 0);
        const costs = safeRoutes.map(r => r.totalCost || 0);

        return {
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            minCost: Math.min(...costs),
            maxCost: Math.max(...costs),
            avgTime: times.reduce((a, b) => a + b, 0) / times.length,
            avgCost: costs.reduce((a, b) => a + b, 0) / costs.length
        };
    }

    /**
     * Format comparison for display
     */
    formatComparison(result: RouteComparisonResult): string {
        const { fastest, cheapest, mostBalanced } = result.comparisonFactors;
        return `Fastest: ${fastest.totalTime}min | Cheapest: ₦${cheapest.totalCost} | Recommended: ${mostBalanced.totalTime}min, ₦${mostBalanced.totalCost}`;
    }
}
