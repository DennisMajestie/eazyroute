// src/app/core/services/route-generation-http.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AllUrlService } from '../../services/allUrl.service';

export interface RouteGenerationResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface GenerateRoutesRequest {
  startLocation: {
    latitude: number;
    longitude: number;
  };
  endLocation: {
    latitude: number;
    longitude: number;
  };
  maxAlternatives?: number;
}

export interface CalculateFareRequest {
  route: any;
}

@Injectable({
  providedIn: 'root'
})
export class RouteGenerationHttpService {
  private urls: any;

  constructor(
    private http: HttpClient,
    private urlService: AllUrlService
  ) {
    this.urls = this.urlService.getAllUrls();
  }

  /**
   * Generate multiple route candidates
   */
  generateRoutes(request: GenerateRoutesRequest): Observable<RouteGenerationResponse> {
    return this.http.post<RouteGenerationResponse>(
      this.urls.routes.generate,
      request
    );
  }

  /**
   * Calculate fare for a route
   */
  calculateFare(request: CalculateFareRequest): Observable<RouteGenerationResponse> {
    return this.http.post<RouteGenerationResponse>(
      this.urls.routes.calculateFare,
      request
    );
  }

  /**
   * Get alternative routes between two points
   */
  getAlternatives(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Observable<RouteGenerationResponse> {
    const params = new HttpParams()
      .set('startLat', startLat.toString())
      .set('startLng', startLng.toString())
      .set('endLat', endLat.toString())
      .set('endLng', endLng.toString());

    return this.http.get<RouteGenerationResponse>(
      this.urls.routes.alternatives,
      { params }
    );
  }
}