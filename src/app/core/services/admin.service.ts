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
    ModerationItem,
    EngineHealth,
    PricingAnalytics,
    ContributorStats,
    SafetyIncident,
    SafetyAnalytics,
    UserStats
} from '../../models/admin.types';
import { CommunityReport } from '../../models/community.types';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = `${environment.apiUrl}`;

    constructor(private http: HttpClient) { }

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM DIAGNOSTICS & ANALYTICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get real-time engine health and RAM diagnostics
     */
    getEngineDiagnostics(): Observable<EngineHealth> {
        return this.http.get<{ success: boolean; data: EngineHealth }>(
            `${this.apiUrl}/health`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Get pricing analytics and surge status
     */
    getPricingAnalytics(): Observable<PricingAnalytics> {
        return this.http.get<{ success: boolean; data: PricingAnalytics }>(
            `${this.apiUrl}/pricing/admin/list`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Get all active community reports for map visualization
     */
    getCommunityReports(): Observable<CommunityReport[]> {
        return this.http.get<{ success: boolean; data: CommunityReport[] }>(
            `${this.apiUrl}/community/reports/all`
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Get top community contributors (Captains) and their trust metrics
     */
    getTopContributors(): Observable<ContributorStats[]> {
        return this.http.get<{ success: boolean; data: ContributorStats[] }>(
            `${this.apiUrl}/community/contributors/top`
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Get safety analytics, hotspots, and incident trends
     */
    getSafetyAnalytics(): Observable<SafetyAnalytics> {
        return this.http.get<{ success: boolean; data: SafetyAnalytics }>(
            `${this.apiUrl}/safety/admin/analytics`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Get detailed history of recent safety incidents (SOS triggers)
     */
    getIncidentHistory(): Observable<SafetyIncident[]> {
        return this.http.get<{ success: boolean; data: SafetyIncident[] }>(
            `${this.apiUrl}/safety/admin/history`
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Get real-time user statistics from the database
     */
    getUserStats(): Observable<UserStats> {
        return this.http.get<{ success: boolean; data: UserStats }>(
            `${this.apiUrl}/users/admin/stats`
        ).pipe(
            map(response => response.data)
        );
    }

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
     * Trigger Class D Graph Repair (Snapping Strategy)
     */
    repairGraph(): Observable<any> {
        return this.http.post<{ success: boolean; data: any }>(
            `${this.apiUrl}/graph/repair`,
            {}
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

    /**
     * Seed a new connection between stops manually
     * Automatically calculates distance and time on the backend
     */
    seedRoute(payload: {
        fromStopId: string;
        toStopId: string;
        transportMode: string;
        priceRange: { min: number; max: number };
        isOneWay?: boolean;
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/route-segments/admin/seed`, payload);
    }

    /**
     * Update Soul v2 transport preferences for a bus stop (Admin only)
     */
    updateBusStopPreferences(id: string, preferences: {
        firstLegPreferredMode?: string;
        bridgeModePreference?: string;
    }): Observable<any> {
        return this.http.patch(`${this.apiUrl}/bus-stops/${id}/soul-v2-preferences`, preferences);
    }

    // ═══════════════════════════════════════════════════════════════
    // MODERATION QUEUE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get items in the moderation queue
     */
    getModerationQueue(): Observable<ModerationItem[]> {
        return this.http.get<{ success: boolean; data: any[] }>(
            `${this.apiUrl}/moderation/queue`
        ).pipe(
            map(response => (response.data || []).map(item => ({
                ...item,
                _id: item._id || item.id, // Support both _id and id
                type: item.itemType,
                status: item.action,
                flags: item.flags || [],
                autoFlags: item.autoFlags || { suspiciousActivity: false, duplicateSubmission: false, rapidUpvotes: false },
                submittedBy: typeof item.submittedBy === 'object' ? (item.submittedBy.name || item.submittedBy.email) : item.submittedBy
            } as ModerationItem)))
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

    /**
     * Explicitly promote a high-performing contributor to 'Captain' status
     */
    promoteToCaptain(userId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/community/promote/${userId}`, {});
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

    /**
     * Get all harvested (inactive and pending) bus stops
     */
    getHarvestedBusStops(page: number = 1, limit: number = 50, search?: string): Observable<{ data: any[]; total: number }> {
        let params = `?page=${page}&limit=${limit}&isActive=false&verificationStatus=pending`;
        if (search) params += `&search=${search}`;
        return this.http.get<{ success: boolean; data: any[]; pagination: any }>(
            `${this.apiUrl}/bus-stops${params}`
        ).pipe(
            map(response => ({
                data: response.data || [],
                total: response.pagination?.total || 0
            }))
        );
    }
}
