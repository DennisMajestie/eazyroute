import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusStop, CreateBusStopRequest, TransportMode, SearchBusStopParams } from '../../models/bus-stop.model';
import { TransportPointType } from '../../models/transport-point.constants';

export interface UnverifiedBusStop {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  localNames?: string[];
  transportModes?: TransportMode[];
}

@Injectable({
  providedIn: 'root'
})
export class BusStopService {
  private apiUrl = `${environment.apiUrl}/bus-stops`;

  constructor(private http: HttpClient) { }

  /**
   * Get all stops with optional search and filters
   * Backend returns { success, data, pagination } format
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
    }

    return this.http.get<{ success: boolean; data: BusStop[] }>(this.apiUrl, { params: httpParams }).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Search transport points with advanced filtering
   * Backend returns { success, data, pagination } format
   */
  searchStops(params: SearchBusStopParams): Observable<BusStop[]> {
    let httpParams = new HttpParams();

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.transportMode) httpParams = httpParams.set('transportMode', params.transportMode);
    if (params.verificationStatus) httpParams = httpParams.set('verificationStatus', params.verificationStatus);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<{ success: boolean; data: BusStop[] }>(this.apiUrl, { params: httpParams }).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get nearby stops within radius
   */
  getNearbyStops(latitude: number, longitude: number, radiusMeters: number): Observable<BusStop[]> {
    return this.http.get<BusStop[]>(`${this.apiUrl}/nearby`, {
      params: {
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusMeters.toString()
      }
    });
  }

  /**
   * Get single stop by ID
   */
  getStopById(id: string | number): Observable<BusStop> {
    return this.http.get<BusStop>(`${this.apiUrl}/${id}`);
  }

  /**
   * Add new stop (basic creation)
   */
  addStop(stop: CreateBusStopRequest): Observable<BusStop> {
    return this.http.post<BusStop>(this.apiUrl, stop);
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

    // Append photos
    if (data.photos && data.photos.length > 0) {
      data.photos.forEach((photo, index) => {
        formData.append('photos', photo, photo.name);
      });
    }

    return this.http.post<BusStop>(`${this.apiUrl}/submit`, formData);
  }

  /**
   * Submit missing stop (legacy method)
   */
  submitMissingStop(stop: UnverifiedBusStop): Observable<any> {
    return this.http.post(`${this.apiUrl}/submit`, stop);
  }

  /**
   * Verify a stop (admin only)
   */
  verifyStop(stopId: number | string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify/${stopId}`, {});
  }

  /**
   * Search bus stops by name or local names (legacy method)
   */
  searchByLocalName(query: string): Observable<BusStop[]> {
    return this.http.get<BusStop[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    });
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

  /**
   * Helper: Validate photo file
   */
  validatePhoto(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
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
   * Helper: Validate multiple photos
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
