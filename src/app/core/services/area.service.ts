import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Area, Territory, LGA, AreaSearchResult, AreaStatistics } from '../../models/area.model';

@Injectable({
    providedIn: 'root'
})
export class AreaService {
    private apiUrl = `${environment.apiUrl}/locality`;

    constructor(private http: HttpClient) { }

    /**
     * Get all territories (37 Nigerian states)
     */
    getTerritories(): Observable<Territory[]> {
        return this.http.get<{ success: boolean; data: Territory[] }>(`${this.apiUrl}/territories`)
            .pipe(
                map(response => response.data || []),
                catchError(error => {
                    console.error('Error fetching territories:', error);
                    return of(this.getMockTerritories());
                })
            );
    }

    /**
     * Get areas by territory (state)
     * Example: /locality/areas?territory=Lagos State
     */
    getAreasByTerritory(territory: string): Observable<Area[]> {
        const params = new HttpParams().set('territory', territory);
        return this.http.get<{ success: boolean; data: Area[] }>(`${this.apiUrl}/areas`, { params })
            .pipe(
                map(response => response.data || []),
                catchError(error => {
                    console.error('Error fetching areas by territory:', error);
                    return of([]);
                })
            );
    }

    /**
     * Get areas by LGA
     * Example: /locality/areas?lga=Ikeja
     */
    getAreasByLGA(lga: string): Observable<Area[]> {
        const params = new HttpParams().set('lga', lga);
        return this.http.get<{ success: boolean; data: Area[] }>(`${this.apiUrl}/areas`, { params })
            .pipe(
                map(response => response.data || []),
                catchError(error => {
                    console.error('Error fetching areas by LGA:', error);
                    return of([]);
                })
            );
    }

    /**
     * Search areas nationwide (across all 2,468 areas)
     * Example: /locality/areas?search=wuse
     */
    searchAreas(query: string): Observable<AreaSearchResult[]> {
        if (!query || query.length < 2) {
            return of([]);
        }

        const params = new HttpParams().set('search', query);
        return this.http.get<{ success: boolean; data: Area[] }>(`${this.apiUrl}/areas`, { params })
            .pipe(
                map(response => {
                    const areas = response.data || [];
                    return (areas || []).filter(a => !!a).map(area => ({
                        area,
                        matchType: this.getMatchType(area, query),
                        relevanceScore: this.calculateRelevance(area, query)
                    })).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
                }),
                catchError(error => {
                    console.error('Error searching areas:', error);
                    return of([]);
                })
            );
    }

    /**
     * Get area by ID
     */
    getAreaById(id: number): Observable<Area | null> {
        return this.http.get<{ success: boolean; data: Area }>(`${this.apiUrl}/areas/${id}`)
            .pipe(
                map(response => response.data || null),
                catchError(error => {
                    console.error('Error fetching area:', error);
                    return of(null);
                })
            );
    }

    /**
     * Get area statistics
     */
    getStatistics(): Observable<AreaStatistics> {
        return this.http.get<{ success: boolean; data: AreaStatistics }>(`${this.apiUrl}/areas/statistics`)
            .pipe(
                map(response => response.data || this.getDefaultStatistics()),
                catchError(error => {
                    console.error('Error fetching statistics:', error);
                    return of(this.getDefaultStatistics());
                })
            );
    }

    /**
     * Get popular territories (Lagos, FCT, Kano, etc.)
     */
    getPopularTerritories(): Observable<Territory[]> {
        return this.getTerritories().pipe(
            map(territories => territories.filter(t => t.isPopular).slice(0, 5))
        );
    }

    /**
     * Helper: Determine match type
     */
    private getMatchType(area: Area, query: string): 'name' | 'lga' | 'territory' {
        const lowerQuery = query.toLowerCase();
        if (area.name.toLowerCase().includes(lowerQuery)) return 'name';
        if (area.lga.toLowerCase().includes(lowerQuery)) return 'lga';
        return 'territory';
    }

    /**
     * Helper: Calculate relevance score
     */
    private calculateRelevance(area: Area, query: string): number {
        const lowerQuery = query.toLowerCase();
        let score = 0;

        // Exact match
        if (area.name.toLowerCase() === lowerQuery) score += 100;
        // Starts with query
        else if (area.name.toLowerCase().startsWith(lowerQuery)) score += 50;
        // Contains query
        else if (area.name.toLowerCase().includes(lowerQuery)) score += 25;

        // Boost for mapped areas
        if (area.status === 'active' && area.localityCount && area.localityCount > 0) {
            score += 10;
        }

        return score;
    }

    /**
     * Mock data for popular territories (fallback)
     */
    private getMockTerritories(): Territory[] {
        return [
            { name: 'Lagos State', areaCount: 85, isPopular: true },
            { name: 'Federal Capital Territory', areaCount: 27, isPopular: true },
            { name: 'Kano State', areaCount: 132, isPopular: true },
            { name: 'Rivers State', areaCount: 69, isPopular: true },
            { name: 'Oyo State', areaCount: 98, isPopular: true }
        ];
    }

    /**
     * Default statistics
     */
    private getDefaultStatistics(): AreaStatistics {
        return {
            totalAreas: 2468,
            totalTerritories: 37,
            totalLGAs: 778,
            mappedAreas: 0,
            unmappedAreas: 2468
        };
    }
}
