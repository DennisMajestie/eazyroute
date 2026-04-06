import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';

export interface DashboardHomeResponse {
  success: boolean;
  data: {
    userContext: any;
    activeTrip: any;
    nearbyStops: any[];
    trendingRoutes: any[];
  };
}

export interface DashboardSearchResponse {
  success: boolean;
  data: {
    busStops: any[];
    routes: any[];
    tagAlongs: any[];
  };
}

export interface DashboardFeedResponse {
  success: boolean;
  data: any[];
}

/**
 * DashboardService — Consumes the unified /dashboard endpoints
 * to aggregate data for the dashboard in fewer network requests.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(ApiService);

  /**
   * GET /dashboard/home
   * Aggregates userContext, activeTrip, nearbyStops, trendingRoutes.
   */
  getHomeDashboard(lat?: number, lng?: number): Observable<DashboardHomeResponse> {
    let params = new HttpParams();
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      params = params.set('lat', lat.toString()).set('lng', lng.toString());
    }
    return this.api.get<DashboardHomeResponse>('/dashboard/home', params);
  }

  /**
   * GET /dashboard/search?q=...
   * Omnibar global search across bus stops, routes, tag-alongs.
   */
  globalSearch(query: string): Observable<DashboardSearchResponse> {
    const params = new HttpParams().set('q', query);
    return this.api.get<DashboardSearchResponse>('/dashboard/search', params);
  }

  /**
   * GET /dashboard/feed?tab=routes|tag-along|pulse
   * Modular content feed by tab.
   */
  getContentFeed(tab: 'routes' | 'tag-along' | 'pulse'): Observable<DashboardFeedResponse> {
    const params = new HttpParams().set('tab', tab);
    return this.api.get<DashboardFeedResponse>('/dashboard/feed', params);
  }
}
