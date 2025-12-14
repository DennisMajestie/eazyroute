// src/app/core/services/trip-http.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AllUrlService } from '../../services/allUrl.service';

export interface TripResponse {
  success: boolean;
  message?: string;
  data?: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateTripRequest {
  routeId?: string;
  originLocation: {
    latitude: number;
    longitude: number;
  };
  destinationLocation: {
    latitude: number;
    longitude: number;
  };
  selectedRoute: any;
}

export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class TripHttpService {
  private urls: any;

  constructor(
    private http: HttpClient,
    private urlService: AllUrlService
  ) {
    this.urls = this.urlService.getAllUrls();
  }

  /**
   * Create a new trip
   */
  createTrip(request: CreateTripRequest): Observable<TripResponse> {
    return this.http.post<TripResponse>(this.urls.trips.create, request);
  }

  /**
   * Get all trips for user
   */
  getAllTrips(status?: string, page: number = 1, limit: number = 10): Observable<TripResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<TripResponse>(this.urls.trips.getAll, { params });
  }

  /**
   * Get active trip
   */
  getActiveTrip(): Observable<TripResponse> {
    return this.http.get<TripResponse>(this.urls.trips.getActive);
  }

  /**
   * Get trip by ID
   */
  getTripById(tripId: string): Observable<TripResponse> {
    return this.http.get<TripResponse>(`${this.urls.trips.getOne}${tripId}`);
  }

  /**
   * Start a trip
   */
  startTrip(tripId: string): Observable<TripResponse> {
    return this.http.post<TripResponse>(`${this.urls.trips.start}${tripId}/start`, {});
  }

  /**
   * Pause a trip
   */
  pauseTrip(tripId: string): Observable<TripResponse> {
    return this.http.post<TripResponse>(`${this.urls.trips.pause}${tripId}/pause`, {});
  }

  /**
   * Resume a trip
   */
  resumeTrip(tripId: string): Observable<TripResponse> {
    return this.http.post<TripResponse>(`${this.urls.trips.resume}${tripId}/resume`, {});
  }

  /**
   * Complete a trip
   */
  completeTrip(tripId: string, actualCost?: number, feedback?: string): Observable<TripResponse> {
    return this.http.post<TripResponse>(
      `${this.urls.trips.complete}${tripId}/complete`,
      { actualCost, feedback }
    );
  }

  /**
   * Cancel a trip
   */
  cancelTrip(tripId: string, reason?: string): Observable<TripResponse> {
    return this.http.post<TripResponse>(
      `${this.urls.trips.cancel}${tripId}/cancel`,
      { reason }
    );
  }

  /**
   * Update trip location
   */
  updateLocation(tripId: string, location: UpdateLocationRequest): Observable<TripResponse> {
    return this.http.post<TripResponse>(
      `${this.urls.trips.updateLocation}${tripId}/location`,
      location
    );
  }

  /**
   * Check deviation from route
   */
  checkDeviation(tripId: string): Observable<TripResponse> {
    return this.http.get<TripResponse>(
      `${this.urls.trips.checkDeviation}${tripId}/check-deviation`
    );
  }

  /**
   * Get trip milestones
   */
  getMilestones(tripId: string): Observable<TripResponse> {
    return this.http.get<TripResponse>(
      `${this.urls.trips.getMilestones}${tripId}/milestones`
    );
  }

  /**
   * Update milestone
   */
  updateMilestone(tripId: string, milestoneId: string, data: any): Observable<TripResponse> {
    return this.http.patch<TripResponse>(
      `${this.urls.trips.updateMilestone}${tripId}/milestones/${milestoneId}`,
      data
    );
  }

  /**
   * Get trip history
   */
  getTripHistory(page: number = 1, limit: number = 20): Observable<TripResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<TripResponse>(this.urls.trips.history, { params });
  }

  /**
   * Get trip statistics
   */
  getTripStats(): Observable<TripResponse> {
    return this.http.get<TripResponse>(this.urls.trips.stats);
  }
}