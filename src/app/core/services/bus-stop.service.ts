/**
 * Unified Bus Stop Service
 * Handles all bus stop related API calls
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusStop, CreateBusStopRequest, TransportMode, SearchBusStopParams, FuzzySearchResult } from '../../models/bus-stop.model';
import { EnhancedBusStop, BusStopSearchResponse } from '../../models/enhanced-bus-stop.model';
import { TransportPointType } from '../../models/transport-point.constants';

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface UnverifiedBusStop {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  localNames?: string[];
  transportModes?: TransportMode[];
  type?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface BusStopResponse {
  _id: string;
  id?: string;
  name: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  type?: string;
  localNames?: string[];
  routes: string[];
  verified: boolean;
  description?: string;
  activeBuses?: number;
  area?: string;
  address?: string;
  landmarks?: string[];
  dist?: { calculated: number };
  backboneSide?: 'L' | 'R' | 'C';
  tier?: 'primary' | 'sub-landmark' | 'node';
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BusStopService {
  private apiUrl = `${environment.apiUrl}/bus-stops`;

  constructor(private http: HttpClient) { }

  // ═══════════════════════════════════════════════════════════════
  // SEARCH & QUERY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all stops with optional search and filters
   */
  getAllStops(params?: SearchBusStopParams): Observable<BusStop[]> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.transportMode) httpParams = httpParams.set('transportMode', params.transportMode);
      if (params.verificationStatus) httpParams = httpParams.set('verificationStatus', params.verificationStatus);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
    }

    return this.http.get<{ success: boolean; data: BusStop[] }>(this.apiUrl, { params: httpParams }).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get all bus stops with pagination (from BusStopHttpService)
   */
  getAllBusStops(page: number = 1, limit: number = 20, isActive: boolean = true): Observable<PaginatedResponse<BusStopResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('isActive', isActive.toString());

    return this.http.get<PaginatedResponse<BusStopResponse>>(this.apiUrl, { params });
  }

  /**
   * Search transport points with advanced filtering
   */
  searchStops(params: SearchBusStopParams): Observable<BusStop[]> {
    let httpParams = new HttpParams();

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.transportMode) httpParams = httpParams.set('transportMode', params.transportMode);
    if (params.verificationStatus) httpParams = httpParams.set('verificationStatus', params.verificationStatus);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.sort) httpParams = httpParams.set('sort', params.sort);

    return this.http.get<{ success: boolean; data: BusStop[] }>(this.apiUrl, { params: httpParams }).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Search bus stops (simple query - from BusStopHttpService)
   */
  searchBusStops(query: string): Observable<ApiResponse<BusStopResponse[]>> {
    const params = new HttpParams().set('search', query);
    return this.http.get<ApiResponse<BusStopResponse[]>>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Search with local names and tier information (from BusStopHttpService)
   */
  searchWithLocalNames(query: string, limit: number = 10): Observable<BusStopSearchResponse> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString());

    return this.http.get<BusStopSearchResponse>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Search bus stops by name or local names (legacy)
   */
  searchByLocalName(query: string): Observable<BusStop[]> {
    return this.http.get<BusStop[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    });
  }

  /**
   * Fuzzy search with relevance scoring
   */
  fuzzySearch(query: string, city?: string, limit: number = 10): Observable<FuzzySearchResult[]> {
    let params = new HttpParams().set('q', query).set('limit', limit.toString());
    if (city) {
      params = params.set('city', city);
    }

    return this.http.get<{ success: boolean; data: FuzzySearchResult[] }>(
      `${this.apiUrl}/fuzzy-search`,
      { params }
    ).pipe(
      map(response => response.data || [])
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LOCATION-BASED METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get nearby stops (enhanced with limit parameter)
   */
  getNearbyStops(latitude?: number, longitude?: number, radius: number = 2000, limit: number = 10): Observable<BusStopSearchResponse> {
    let params = new HttpParams()
      .set('radius', radius.toString())
      .set('limit', limit.toString());

    if (latitude !== undefined) params = params.set('lat', latitude.toString());
    if (longitude !== undefined) params.set('lng', longitude.toString());

    return this.http.get<BusStopSearchResponse>(`${this.apiUrl}/nearby`, { params });
  }

  /**
   * Get bus stops by area
   */
  getBusStopsByArea(area: string): Observable<ApiResponse<BusStopResponse[]>> {
    const params = new HttpParams().set('area', area);
    return this.http.get<ApiResponse<BusStopResponse[]>>(`${this.apiUrl}/by-area`, { params });
  }

  // ═══════════════════════════════════════════════════════════════
  // SINGLE RECORD METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get single stop by ID
   */
  getStopById(id: string | number): Observable<BusStop> {
    return this.http.get<BusStop>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get bus stop by ID (returns ApiResponse wrapper)
   */
  getBusStopById(id: string): Observable<ApiResponse<BusStopResponse>> {
    return this.http.get<ApiResponse<BusStopResponse>>(`${this.apiUrl}/${id}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // CREATE & SUBMIT METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Add new stop (basic creation)
   */
  addStop(stop: CreateBusStopRequest): Observable<BusStop> {
    return this.http.post<BusStop>(this.apiUrl, stop);
  }

  /**
   * Create bus stop (from BusStopHttpService)
   */
  createBusStop(data: {
    name: string;
    latitude: number;
    longitude: number;
    area?: string;
    landmarks?: string[];
  }): Observable<ApiResponse<BusStopResponse>> {
    return this.http.post<ApiResponse<BusStopResponse>>(this.apiUrl, data);
  }

  /**
   * Submit new transport point with photos (FormData)
   */
  submitTransportPoint(data: {
    name: string;
    type: TransportPointType;
    latitude: number;
    longitude: number;
    localNames?: string[];
    transportModes: TransportMode[];
    address?: string;
    city?: string;
    area?: string;
    description?: string;
    photos?: File[];
  }): Observable<BusStop> {
    const formData = new FormData();

    formData.append('name', data.name);
    formData.append('type', data.type);
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());

    if (data.localNames && data.localNames.length > 0) {
      formData.append('localNames', JSON.stringify(data.localNames));
    }

    if (data.transportModes && data.transportModes.length > 0) {
      formData.append('transportModes', JSON.stringify(data.transportModes));
    }

    if (data.address) formData.append('address', data.address);
    if (data.city) formData.append('city', data.city);
    if (data.area) formData.append('area', data.area);
    if (data.description) formData.append('description', data.description);

    if (data.photos && data.photos.length > 0) {
      data.photos.forEach((photo) => {
        formData.append('photos', photo, photo.name);
      });
    }

    return this.http.post<BusStop>(`${this.apiUrl}/submit`, formData);
  }

  /**
   * Submit missing stop
   */
  submitPlace(data: any): Observable<any> {
    const payload = {
      ...data,
      localNames: data.localName ? [data.localName] : (data.localNames || [])
    };
    return this.http.post(`${this.apiUrl}/submit`, payload);
  }

  /**
   * Submit missing stop (legacy alias)
   */
  submitMissingStop(stop: UnverifiedBusStop): Observable<any> {
    return this.submitPlace(stop);
  }

  // ═══════════════════════════════════════════════════════════════
  // VERIFICATION & VOTING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all pending stops for verification
   */
  getPendingStops(): Observable<BusStop[]> {
    return this.http.get<{ success: boolean; data: BusStop[] }>(`${this.apiUrl}/pending`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Verify a stop (with action)
   */
  verifyStop(stopId: number | string, action: 'verify' | 'reject' = 'verify'): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify/${stopId}`, { action });
  }

  /**
   * Verify bus stop (simple - from BusStopHttpService)
   */
  verifyBusStop(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/verify`, {});
  }

  /**
   * Upvote a transport point
   */
  upvoteStop(stopId: number | string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${stopId}/upvote`, {});
  }

  /**
   * Downvote a transport point
   */
  downvoteStop(stopId: number | string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${stopId}/downvote`, {});
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate photo file
   */
  validatePhoto(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Image size must be less than 5MB' };
    }

    return { valid: true };
  }

  /**
   * Validate multiple photos
   */
  validatePhotos(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxPhotos = 5;

    if (files.length > maxPhotos) {
      errors.push(`Maximum ${maxPhotos} photos allowed`);
    }

    files.forEach((file, index) => {
      const validation = this.validatePhoto(file);
      if (!validation.valid) {
        errors.push(`Photo ${index + 1}: ${validation.error}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }
}
