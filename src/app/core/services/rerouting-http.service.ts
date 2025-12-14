// src/app/core/services/rerouting-http.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AllUrlService } from '../../services/allUrl.service';

export interface ReroutingResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface CheckDeviationRequest {
  tripId: string;
  latitude: number;
  longitude: number;
}

export interface GenerateRerouteRequest {
  tripId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  destinationLocation: {
    latitude: number;
    longitude: number;
  };
}

export interface ApplyRerouteRequest {
  newRoute: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReroutingHttpService {
  private urls: any;

  constructor(
    private http: HttpClient,
    private urlService: AllUrlService
  ) {
    this.urls = this.urlService.getAllUrls();
  }

  /**
   * Check if trip has deviated from route
   */
  checkDeviation(request: CheckDeviationRequest): Observable<ReroutingResponse> {
    return this.http.post<ReroutingResponse>(
      this.urls.rerouting.checkDeviation,
      request
    );
  }

  /**
   * Generate alternative route for deviated trip
   */
  generateReroute(request: GenerateRerouteRequest): Observable<ReroutingResponse> {
    return this.http.post<ReroutingResponse>(
      this.urls.rerouting.generateReroute,
      request
    );
  }

  /**
   * Apply reroute to trip
   */
  applyReroute(tripId: string, request: ApplyRerouteRequest): Observable<ReroutingResponse> {
    return this.http.post<ReroutingResponse>(
      `${this.urls.rerouting.applyReroute}${tripId}/apply`,
      request
    );
  }

  /**
   * Decline reroute suggestion
   */
  declineReroute(tripId: string): Observable<ReroutingResponse> {
    return this.http.post<ReroutingResponse>(
      `${this.urls.rerouting.declineReroute}${tripId}/decline`,
      {}
    );
  }

  /**
   * Get reroute history for a trip
   */
  getRerouteHistory(tripId: string): Observable<ReroutingResponse> {
    return this.http.get<ReroutingResponse>(
      `${this.urls.rerouting.getRerouteHistory}${tripId}/history`
    );
  }

  /**
   * Get pending reroute for a trip
   */
  getPendingReroute(tripId: string): Observable<ReroutingResponse> {
    return this.http.get<ReroutingResponse>(
      `${this.urls.rerouting.getPendingReroute}${tripId}/pending`
    );
  }
}