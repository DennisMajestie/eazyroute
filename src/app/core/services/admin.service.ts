/**
 * Admin Service - Graph Diagnostics and System Management
 * 
 * Features:
 * - Route graph health monitoring
 * - Isolated node detection
 * - Connection suggestions
 * - Graph validation
 * 
 * Note: All endpoints require admin role authorization
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
    GraphReport,
    IsolatedNode,
    ConnectionSuggestion,
    GraphValidation,
    ModerationItem
} from '../../models/admin.types';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = `${environment.apiUrl}`;

    constructor(private http: HttpClient) { }

    // ═══════════════════════════════════════════════════════════════
    // GRAPH DIAGNOSTICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get graph health report
     * Returns overall graph statistics and health status
     */
    getGraphReport(): Observable<GraphReport> {
        return this.http.get<{ success: boolean; data: GraphReport }>(
            `${this.apiUrl}/graph/report`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Get isolated nodes (stops with no connections)
     */
    getIsolatedNodes(): Observable<IsolatedNode[]> {
        return this.http.get<{ success: boolean; data: IsolatedNode[] }>(
            `${this.apiUrl}/graph/isolated`
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Get connection suggestions
     * Returns suggested connections to improve graph connectivity
     */
    getConnectionSuggestions(): Observable<ConnectionSuggestion[]> {
        return this.http.get<{ success: boolean; data: ConnectionSuggestion[] }>(
            `${this.apiUrl}/graph/suggestions`
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Validate graph integrity
     */
    validateGraph(): Observable<GraphValidation> {
        return this.http.get<{ success: boolean; data: GraphValidation }>(
            `${this.apiUrl}/graph/validate`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Create a new connection between stops
     */
    createConnection(fromStopId: string, toStopId: string, data: {
        transportModes: string[];
        estimatedTime: number;
        priceRange: { min: number; max: number };
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/route-segments`, {
            fromStopId,
            toStopId,
            ...data
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // MODERATION QUEUE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get items in the moderation queue
     */
    getModerationQueue(): Observable<ModerationItem[]> {
        return this.http.get<{ success: boolean; data: ModerationItem[] }>(
            `${this.apiUrl}/moderation/queue`
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Approve a moderation item
     */
    approveItem(id: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/moderation/${id}/approve`, {});
    }

    /**
     * Reject a moderation item
     */
    rejectItem(id: string, reason: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/moderation/${id}/reject`, { reason });
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get health status color for UI display
     */
    getHealthColor(health: 'good' | 'moderate' | 'poor'): string {
        switch (health) {
            case 'good': return '#28a745';
            case 'moderate': return '#ffc107';
            case 'poor': return '#dc3545';
            default: return '#6c757d';
        }
    }

    /**
     * Get health status icon
     */
    getHealthIcon(health: 'good' | 'moderate' | 'poor'): string {
        switch (health) {
            case 'good': return '✓';
            case 'moderate': return '⚠';
            case 'poor': return '✕';
            default: return '?';
        }
    }

    /**
     * Format distance for display
     */
    formatDistance(meters: number): string {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        }
        return `${(meters / 1000).toFixed(1)}km`;
    }
}
