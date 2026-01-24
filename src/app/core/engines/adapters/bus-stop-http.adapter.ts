// src/app/core/engines/adapters/bus-stop-http.adapter.ts
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { IBusStopRepository, Location } from '../types/easyroute.types';
import { BusStop } from '../../../models/bus-stop.model';

@Injectable({
  providedIn: 'root'
})
export class BusStopHttpAdapter implements IBusStopRepository {
  constructor(private apiService: ApiService) { }
  findByArea(area: string): Promise<BusStop[]> {
    throw new Error('Method not implemented.');
  }
  save(stop: Omit<BusStop, 'id' | 'createdAt'>): Promise<BusStop> {
    throw new Error('Method not implemented.');
  }
  update(id: number, updates: Partial<BusStop>): Promise<BusStop> {
    throw new Error('Method not implemented.');
  }

  /**
   * Find all bus stops
   */
  async findAll(): Promise<BusStop[]> {
    try {
      const response = await firstValueFrom(
        this.apiService.getBusStops()
      );

      if (response.success && response.data) {
        return this.mapResponseToBusStops(response.data);
      }

      return [];
    } catch (error) {
      console.error('[BusStopAdapter] Error fetching all stops:', error);
      return [];
    }
  }

  /**
   * Find bus stop by ID
   */
  async findById(id: number): Promise<BusStop | null> {
    try {
      const response = await firstValueFrom(
        this.apiService.getBusStopById(id.toString())
      );

      if (response.success && response.data) {
        return this.mapSingleBusStop(response.data);
      }

      return null;
    } catch (error) {
      console.error('[BusStopAdapter] Error fetching stop by ID:', error);
      return null;
    }
  }

  /**
   * Find nearby bus stops within radius
   */
  async findNearby(location: Location, radiusMeters: number): Promise<BusStop[]> {
    try {
      const radiusKm = radiusMeters / 1000; // Convert to km

      const response = await firstValueFrom(
        this.apiService.searchNearbyBusStops(
          location.latitude,
          location.longitude,
          radiusKm
        )
      );

      if (response.success && response.data) {
        return this.mapResponseToBusStops(response.data);
      }

      return [];
    } catch (error) {
      console.error('[BusStopAdapter] Error finding nearby stops:', error);
      return [];
    }
  }

  /**
   * Find stops by city
   */
  async findByCity(city: string): Promise<BusStop[]> {
    try {
      const response = await firstValueFrom(
        this.apiService.getBusStopsByCity(city)
      );

      if (response.success && response.data) {
        return this.mapResponseToBusStops(response.data);
      }

      return [];
    } catch (error) {
      console.error('[BusStopAdapter] Error finding stops by city:', error);
      return [];
    }
  }

  /**
   * Search stops by name
   */
  async searchByName(name: string): Promise<BusStop[]> {
    try {
      const response = await firstValueFrom(
        this.apiService.getBusStops({ search: name })
      );

      if (response.success && response.data) {
        return this.mapResponseToBusStops(response.data);
      }

      return [];
    } catch (error) {
      console.error('[BusStopAdapter] Error searching stops by name:', error);
      return [];
    }
  }

  /**
   * Create new bus stop
   */
  async create(busStop: Partial<BusStop>): Promise<BusStop> {
    try {
      const response = await firstValueFrom(
        this.apiService.createBusStop(busStop)
      );

      if (response.success && response.data) {
        return this.mapSingleBusStop(response.data);
      }

      throw new Error('Failed to create bus stop');
    } catch (error) {
      console.error('[BusStopAdapter] Error creating bus stop:', error);
      throw error;
    }
  }

  /**
   * Helper: Map API response to BusStop array
   */
  private mapResponseToBusStops(data: any): BusStop[] {
    const safeData = Array.isArray(data) ? data : [];
    return safeData.map(item => this.mapSingleBusStop(item));
  }

  /**
   * Helper: Map single API response to BusStop
   */
  private mapSingleBusStop(data: any): BusStop {
    return {
      id: data._id || data.id,
      name: data.name || '',
      type: data.type || 'bus_stop',
      localNames: data.localNames || [],
      location: data.location,
      latitude: data.location?.coordinates?.[1] || data.latitude || 0,
      longitude: data.location?.coordinates?.[0] || data.longitude || 0,
      address: data.address || '',
      city: data.city || '',
      area: data.area || data.address || '',
      verificationStatus: data.verificationStatus || 'pending',
      upvotes: data.upvotes || 0,
      downvotes: data.downvotes || 0,
      transportModes: data.transportModes || [],
      photos: data.photos || [],
      usageCount: data.usageCount || 0,
      isActive: data.isActive ?? true,
      verified: data.verified ?? data.verificationStatus === 'verified',
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
    };
  }
}