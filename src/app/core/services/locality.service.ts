import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
    Locality,
    Anchor,
    MicroNode,
    LocalityHierarchy,
    LocalitySearchResult
} from '../../models/locality.model';

@Injectable({
    providedIn: 'root'
})
export class LocalityService {
    private baseUrl = `${environment.apiUrl}/locality`;

    constructor(private http: HttpClient) { }

    /**
     * Get localities by area ID
     */
    getLocalitiesByArea(areaId: number): Observable<Locality[]> {
        const params = new HttpParams().set('areaId', areaId.toString());
        return this.http.get<{ success: boolean; data: Locality[] }>(
            `${this.baseUrl}/localities`,
            { params }
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Get anchors by locality ID
     */
    getAnchorsByLocality(localityId: number): Observable<Anchor[]> {
        return this.http.get<{ success: boolean; data: Anchor[] }>(
            `${this.baseUrl}/anchors-by-locality/${localityId}`
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Get micro-nodes by anchor ID
     */
    getMicroNodesByAnchor(anchorId: number): Observable<MicroNode[]> {
        const params = new HttpParams().set('anchorId', anchorId.toString());
        return this.http.get<{ success: boolean; data: MicroNode[] }>(
            `${this.baseUrl}/micro-nodes`,
            { params }
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Get complete hierarchy for an area
     */
    getHierarchy(areaId: number): Observable<LocalityHierarchy> {
        return this.http.get<{ success: boolean; data: LocalityHierarchy }>(
            `${this.baseUrl}/hierarchy/${areaId}`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Search localities, anchors, and micro-nodes
     */
    search(query: string, areaId?: number): Observable<LocalitySearchResult[]> {
        let params = new HttpParams().set('q', query);
        if (areaId) {
            params = params.set('areaId', areaId.toString());
        }

        return this.http.get<{ success: boolean; data: LocalitySearchResult[] }>(
            `${this.baseUrl}/search`,
            { params }
        ).pipe(
            map(response => response.data || [])
        );
    }

    /**
     * Get locality by ID
     */
    getLocalityById(localityId: number): Observable<Locality> {
        return this.http.get<{ success: boolean; data: Locality }>(
            `${this.baseUrl}/localities/${localityId}`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Get anchor by ID
     */
    getAnchorById(anchorId: number): Observable<Anchor> {
        return this.http.get<{ success: boolean; data: Anchor }>(
            `${this.baseUrl}/anchors/${anchorId}`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Get micro-node by ID
     */
    getMicroNodeById(microNodeId: number): Observable<MicroNode> {
        return this.http.get<{ success: boolean; data: MicroNode }>(
            `${this.baseUrl}/micro-nodes/${microNodeId}`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Build hierarchy breadcrumb string
     */
    buildHierarchyString(locality?: string, anchor?: string, microNode?: string): string {
        const parts = [];
        if (locality) parts.push(locality);
        if (anchor) parts.push(anchor);
        if (microNode) parts.push(microNode);
        return parts.join(' → ');
    }

    /**
     * Get visibility badge color
     */
    getVisibilityColor(visibility: 'low' | 'medium' | 'high'): string {
        const colors = {
            'low': '#EF4444',      // Red
            'medium': '#F59E0B',   // Orange
            'high': '#10B981'      // Green
        };
        return colors[visibility];
    }

    /**
     * Get safety badge color
     */
    getSafetyColor(safety: 'unsafe' | 'moderate' | 'safe'): string {
        const colors = {
            'unsafe': '#EF4444',    // Red
            'moderate': '#F59E0B',  // Orange
            'safe': '#10B981'       // Green
        };
        return colors[safety];
    }

    /**
     * Get density badge color
     */
    getDensityColor(density: 'low' | 'medium' | 'high'): string {
        const colors = {
            'low': '#6B7280',      // Gray
            'medium': '#F59E0B',   // Orange
            'high': '#10B981'      // Green
        };
        return colors[density];
    }
}
