/**
 * ═══════════════════════════════════════════════════════════════════
 * UPDATED ROUTE HTTP SERVICE (Using Your Environment)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/services/route-http.service.ts
 */

import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { ApiResponse } from "./bus-stop-http.service";

export interface RouteResponse {
  _id: string;
  name: string;
  startLocation: {
    name: string;
    coordinates: [number, number];
  };
  endLocation: {
    name: string;
    coordinates: [number, number];
  };
  stops: Array<{
    stopId: string;
    name: string;
    order: number;
  }>;
  estimatedDuration: number; // minutes
  estimatedFare: number; // naira
  distance: number; // meters
  activeBuses: number;
  trending?: boolean;
  popularity?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RouteHttpService {
  // ✅ Using your environment.apiUrl
  private readonly API_URL = `${environment.apiUrl}/routes`;

  constructor(private http: HttpClient) { }

  /**
   * Get popular routes
   */
  getPopularRoutes(limit: number = 10): Observable<ApiResponse<RouteResponse[]>> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<RouteResponse[]>>(
      `${this.API_URL}/popular`,
      { params }
    );
  }

  /**
   * Get all routes
   */
  getAllRoutes(): Observable<ApiResponse<RouteResponse[]>> {
    return this.http.get<ApiResponse<RouteResponse[]>>(this.API_URL);
  }

  /**
   * Get route by ID
   */
  getRouteById(id: string): Observable<ApiResponse<RouteResponse>> {
    return this.http.get<ApiResponse<RouteResponse>>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Search routes
   */
  searchRoutes(
    from?: string,
    to?: string,
    query?: string
  ): Observable<ApiResponse<RouteResponse[]>> {
    let params = new HttpParams();
    if (from) params = params.set('origin', from);
    if (to) params = params.set('destination', to);
    if (query) params = params.set('name', query);

    return this.http.get<ApiResponse<RouteResponse[]>>(
      `${this.API_URL}/search`,
      { params }
    );
  }

  /**
   * Get routes between two locations
   */
  getRoutesBetween(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Observable<ApiResponse<RouteResponse[]>> {
    const params = new HttpParams()
      .set('fromLat', fromLat.toString())
      .set('fromLng', fromLng.toString())
      .set('toLat', toLat.toString())
      .set('toLng', toLng.toString());

    return this.http.get<ApiResponse<RouteResponse[]>>(
      `${this.API_URL}/between`,
      { params }
    );
  }
}
