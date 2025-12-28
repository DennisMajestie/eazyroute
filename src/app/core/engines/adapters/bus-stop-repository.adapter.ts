// /**
//  * ═══════════════════════════════════════════════════════════════════
//  * BUS STOP ADAPTER - Implements IBusStopRepository
//  * ═══════════════════════════════════════════════════════════════════
//  * 
//  * File: src/app/core/engines/adapters/bus-stop.adapter.ts
//  * 
//  * This adapter bridges your existing BusStopService to the engine's
//  * IBusStopRepository interface.
//  */

// import { Injectable } from '@angular/core';
// import { firstValueFrom } from 'rxjs';
// import { BusStopService } from '../../services/bus-stop.service';
// import { BusStop, CreateBusStopRequest } from '../../../models/bus-stop.model';
// import { IBusStopRepository, Location } from '../types/easyroute.types';

// @Injectable({
//     providedIn: 'root'
// })
// export class BusStopAdapter implements IBusStopRepository {

//     constructor(private busStopService: BusStopService) { }

//     /**
//      * Find bus stop by ID
//      */
//     async findById(id: number): Promise<BusStop | null> {
//         try {
//             // Since your service doesn't have a getById method, 
//             // we'll get all and filter (or you can add this endpoint to backend)
//             const allStops = await firstValueFrom(this.busStopService.getAllStops());
//             return allStops.find(stop => stop.id === id) || null;
//         } catch (error) {
//             console.error('[BusStopAdapter] Error finding stop by ID:', error);
//             return null;
//         }
//     }

//     /**
//      * Find nearby bus stops within radius
//      */
//     async findNearby(location: Location, radiusMeters: number): Promise<BusStop[]> {
//         try {
//             const stops = await firstValueFrom(
//                 this.busStopService.getNearbyStops(
//                     location.latitude,
//                     location.longitude,
//                     radiusMeters
//                 )
//             );
//             return stops || [];
//         } catch (error) {
//             console.error('[BusStopAdapter] Error finding nearby stops:', error);
//             return [];
//         }
//     }

//     /**
//      * Get all bus stops
//      */
//     async findAll(): Promise<BusStop[]> {
//         try {
//             const stops = await firstValueFrom(this.busStopService.getAllStops());
//             return stops || [];
//         } catch (error) {
//             console.error('[BusStopAdapter] Error fetching all stops:', error);
//             return [];
//         }
//     }

//     /**
//      * Find stops by area/region
//      */
//     async findByArea(area: string): Promise<BusStop[]> {
//         try {
//             // Use search to find stops by area name
//             const stops = await firstValueFrom(this.busStopService.searchStops(area));
//             // Filter to exact area match if needed
//             return stops.filter(stop =>
//                 stop.area?.toLowerCase().includes(area.toLowerCase())
//             );
//         } catch (error) {
//             console.error('[BusStopAdapter] Error finding stops by area:', error);
//             return [];
//         }
//     }

//     /**
//      * Save new bus stop
//      */
//     async save(stopData: Omit<BusStop, 'id' | 'createdAt'>): Promise<BusStop> {
//         try {
//             const createRequest: CreateBusStopRequest = {
//                 name: stopData.name,
//                 area: stopData.area,
//                 latitude: stopData.latitude,
//                 longitude: stopData.longitude
//             };

//             const created = await firstValueFrom(this.busStopService.addStop(createRequest));

//             // If caller requested the stop be marked verified on creation, verify after creating
//             if (stopData.verified === true) {
//                 try {
//                     return await firstValueFrom(this.busStopService.verifyStop(created.id));
//                 } catch (verifyError) {
//                     console.error('[BusStopAdapter] Error verifying stop after create:', verifyError);
//                     // Return the created stop if verification fails
//                     return created;
//                 }
//             }

//             return created;
//         } catch (error) {
//             console.error('[BusStopAdapter] Error saving stop:', error);
//             throw error;
//         }
//     }

//     /**
//      * Update existing bus stop
//      */
//     async update(id: number, updates: Partial<BusStop>): Promise<BusStop> {
//         try {
//             // If updating verification status
//             if (updates.verified === true) {
//                 return await firstValueFrom(this.busStopService.verifyStop(id));
//             }

//             // For other updates, you'll need to add a PATCH endpoint to your backend
//             // For now, throw an error to indicate this needs implementation
//             throw new Error('Update functionality not yet implemented in backend');

//         } catch (error) {
//             console.error('[BusStopAdapter] Error updating stop:', error);
//             throw error;
//         }
//     }

//     /**
//      * ═══════════════════════════════════════════════════════════════
//      * ADDITIONAL HELPER METHODS
//      * ═══════════════════════════════════════════════════════════════
//      */

//     /**
//      * Search stops by query string
//      */
//     async searchStops(query: string): Promise<BusStop[]> {
//         try {
//             return await firstValueFrom(this.busStopService.searchStops(query));
//         } catch (error) {
//             console.error('[BusStopAdapter] Error searching stops:', error);
//             return [];
//         }
//     }

//     /**
//      * Calculate distance between two stops
//      */
//     calculateDistance(stop1: BusStop, stop2: BusStop): number {
//         const R = 6371e3; // Earth's radius in meters
//         const φ1 = (stop1.latitude * Math.PI) / 180;
//         const φ2 = (stop2.latitude * Math.PI) / 180;
//         const Δφ = ((stop2.latitude - stop1.latitude) * Math.PI) / 180;
//         const Δλ = ((stop2.longitude - stop1.longitude) * Math.PI) / 180;

//         const a =
//             Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//             Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//         return R * c; // Distance in meters
//     }

//     /**
//      * Filter stops within a specific radius from a location
//      */
//     filterByRadius(
//         stops: BusStop[],
//         center: Location,
//         radiusMeters: number
//     ): BusStop[] {
//         return stops.filter(stop => {
//             const distance = this.calculateDistanceFromLocation(
//                 center,
//                 { latitude: stop.latitude, longitude: stop.longitude }
//             );
//             return distance <= radiusMeters;
//         });
//     }

//     /**
//      * Calculate distance between two locations
//      */
//     private calculateDistanceFromLocation(loc1: Location, loc2: Location): number {
//         const R = 6371e3; // Earth's radius in meters
//         const φ1 = (loc1.latitude * Math.PI) / 180;
//         const φ2 = (loc2.latitude * Math.PI) / 180;
//         const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
//         const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

//         const a =
//             Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//             Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//         return R * c;
//     }
// }

// /**
//  * ═══════════════════════════════════════════════════════════════════
//  * PROVIDER CONFIGURATION
//  * ═══════════════════════════════════════════════════════════════════
//  * 
//  * Add this to your app.config.ts providers array:
//  * 
//  * import { BusStopAdapter } from './core/engines/adapters/bus-stop.adapter';
//  * import { IBusStopRepository } from './core/engines/types/easyroute.types';
//  * 
//  * providers: [
//  *   { provide: 'IBusStopRepository', useClass: BusStopAdapter },
//  *   // ... other providers
//  * ]
//  * 
//  * Then inject in engines like:
//  * constructor(@Inject('IBusStopRepository') private busStopRepo: IBusStopRepository)
//  */

// ═══════════════════════════════════════════════════════════════════
// FILE 1: Bus Stop Repository Adapter
// Location: src/app/core/engines/adapters/bus-stop-repository.adapter.ts
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BusStopService } from '../../services/bus-stop.service';
import { BusStop } from '../../../models/bus-stop.model';
import { IBusStopRepository, Location } from '../types/easyroute.types';

@Injectable({
  providedIn: 'root'
})
export class BusStopRepositoryAdapter implements IBusStopRepository {
  constructor(private busStopService: BusStopService) { }

  async findById(id: number): Promise<BusStop | null> {
    try {
      const allStops = await firstValueFrom(this.busStopService.getAllStops());
      return allStops.find(stop => stop.id === id) || null;
    } catch (error) {
      console.error('[BusStopRepo] Error finding stop by ID:', error);
      return null;
    }
  }

  async findNearby(location: Location, radiusMeters: number): Promise<BusStop[]> {
    try {
      const response = await firstValueFrom(
        this.busStopService.getNearbyStops(
          location.latitude,
          location.longitude,
          radiusMeters
        )
      );
      // Extract data array from response, cast to BusStop[]
      return (response.data || []) as unknown as BusStop[];
    } catch (error) {
      console.error('[BusStopRepo] Error finding nearby stops:', error);
      return [];
    }
  }

  async findAll(): Promise<BusStop[]> {
    try {
      return await firstValueFrom(this.busStopService.getAllStops());
    } catch (error) {
      console.error('[BusStopRepo] Error finding all stops:', error);
      return [];
    }
  }

  async findByArea(area: string): Promise<BusStop[]> {
    try {
      const allStops = await this.findAll();
      return allStops.filter(stop =>
        stop.area.toLowerCase().includes(area.toLowerCase())
      );
    } catch (error) {
      console.error('[BusStopRepo] Error finding stops by area:', error);
      return [];
    }
  }

  async save(stop: Omit<BusStop, 'id' | 'createdAt'>): Promise<BusStop> {
    try {
      return await firstValueFrom(
        this.busStopService.addStop({
          name: stop.name,
          type: stop.type,
          area: stop.area,
          latitude: stop.latitude,
          longitude: stop.longitude,
          transportModes: stop.transportModes,
          localNames: stop.localNames,
          address: stop.address,
          city: stop.city
        })
      );
    } catch (error) {
      console.error('[BusStopRepo] Error saving stop:', error);
      throw error;
    }
  }

  async update(id: number, updates: Partial<BusStop>): Promise<BusStop> {
    try {
      // If the update is for verification
      if (updates.verified) {
        return await firstValueFrom(this.busStopService.verifyStop(id));
      }

      // For other updates, you'd need to implement an update endpoint
      // For now, throw an error or return the original
      throw new Error('General update not implemented yet');
    } catch (error) {
      console.error('[BusStopRepo] Error updating stop:', error);
      throw error;
    }
  }
}