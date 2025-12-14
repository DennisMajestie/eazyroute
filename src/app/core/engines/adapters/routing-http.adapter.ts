// // src/app/core/engines/adapters/routing-http.adapter.ts
// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { firstValueFrom } from 'rxjs';
// import { IRoutingService, Location, TransportMode } from '../types/easyroute.types';
// import { AllUrlService } from '../../../services/allUrl.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class RoutingHttpAdapter implements IRoutingService {
//   private urls: any;

//   constructor(
//     private http: HttpClient,
//     private urlService: AllUrlService
//   ) {
//     this.urls = this.urlService.getAllUrls();
//   }

//   /**
//    * Calculate route between two locations
//    */
//   async calculateRoute(
//     from: Location,
//     to: Location,
//     mode: TransportMode
//   ): Promise<{ distance: number; duration: number; path: Location[]; polyline?: string }> {
//     try {
//       const response = await firstValueFrom(
//         this.http.post<any>(this.urls.routing.calculateRoute, {
//           from: {
//             latitude: from.latitude,
//             longitude: from.longitude
//           },
//           to: {
//             latitude: to.latitude,
//             longitude: to.longitude
//           },
//           mode: mode.type
//         })
//       );

//       if (response.success && response.data) {
//         return {
//           distance: response.data.distance || 0,
//           duration: response.data.duration || 0,
//           path: response.data.path || [from, to],
//           polyline: response.data.polyline
//         };
//       }

//       // Fallback: calculate straight-line distance
//       return this.calculateStraightLineRoute(from, to, mode);
//     } catch (error) {
//       console.error('[RoutingAdapter] Error calculating route:', error);
//       return this.calculateStraightLineRoute(from, to, mode);
//     }
//   }

//   /**
//    * Get turn-by-turn directions
//    */
//   async getDirections(
//     from: Location,
//     to: Location,
//     mode: TransportMode
//   ): Promise<string[]> {
//     try {
//       const response = await firstValueFrom(
//         this.http.post<any>(this.urls.routing.getDirections, {
//           from,
//           to,
//           mode: mode.type
//         })
//       );

//       if (response.success && response.data?.directions) {
//         return response.data.directions;
//       }

//       return [`Head towards destination (${this.calculateDistance(from, to).toFixed(1)}km)`];
//     } catch (error) {
//       console.error('[RoutingAdapter] Error getting directions:', error);
//       return [`Head towards destination`];
//     }
//   }

//   /**
//    * Validate if a path is traversable
//    */
//   async validatePath(path: Location[]): Promise<boolean> {
//     try {
//       const response = await firstValueFrom(
//         this.http.post<any>(this.urls.routing.validatePath, { path })
//       );

//       return response.success && response.data?.isValid;
//     } catch (error) {
//       console.error('[RoutingAdapter] Error validating path:', error);
//       return true; // Assume valid on error
//     }
//   }

//   /**
//    * Fallback: Calculate straight-line route
//    */
//   private calculateStraightLineRoute(
//     from: Location,
//     to: Location,
//     mode: TransportMode
//   ): { distance: number; duration: number; path?: Location[] } {
//     const distance = this.calculateDistance(from, to);
//     const speedKmh = mode.avgSpeedKmh || 25;
//     const duration = (distance / speedKmh) * 60; // Convert to minutes

//     return {
//       distance: distance * 1000, // Convert to meters
//       duration,
//       path: [from, to]
//     };
//   }

//   /**
//    * Calculate distance using Haversine formula (in km)
//    */
//   private calculateDistance(from: Location, to: Location): number {
//     const R = 6371; // Earth's radius in km
//     const dLat = this.toRadians(to.latitude - from.latitude);
//     const dLon = this.toRadians(to.longitude - from.longitude);

//     const a =
//       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//       Math.cos(this.toRadians(from.latitude)) *
//       Math.cos(this.toRadians(to.latitude)) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);

//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
//   }

//   private toRadians(degrees: number): number {
//     return degrees * (Math.PI / 180);
//   }
// }// src/app/core/engines/adapters/routing-http.adapter.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IRoutingService, Location, TransportMode } from '../types/easyroute.types';
import { AllUrlService } from '../../../services/allUrl.service';

@Injectable({
  providedIn: 'root'
})
export class RoutingHttpAdapter implements IRoutingService {
  private urls: any;

  constructor(
    private http: HttpClient,
    private urlService: AllUrlService
  ) {
    this.urls = this.urlService.getAllUrls();
  }

  /**
   * Calculate route between two locations
   */
  async calculateRoute(
    from: Location,
    to: Location,
    mode: TransportMode
  ): Promise<{ distance: number; duration: number; path: Location[]; polyline?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(this.urls.routing.calculateRoute, {
          from: {
            latitude: from.latitude,
            longitude: from.longitude
          },
          to: {
            latitude: to.latitude,
            longitude: to.longitude
          },
          mode: mode.type
        })
      );

      if (response.success && response.data) {
        return {
          distance: response.data.distance || 0,
          duration: response.data.duration || 0,
          path: response.data.path || [from, to],
          polyline: response.data.polyline
        };
      }

      // Fallback: calculate straight-line distance
      return this.calculateStraightLineRoute(from, to, mode);
    } catch (error) {
      console.error('[RoutingAdapter] Error calculating route:', error);
      return this.calculateStraightLineRoute(from, to, mode);
    }
  }

  /**
   * Calculate route through multiple stops
   */
  async calculateMultiStopRoute(
    stops: Location[],
    mode: TransportMode
  ): Promise<{ distance: number; duration: number; path: Location[]; polyline?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(this.urls.routing.calculateRoute, {
          stops,
          mode: mode.type,
          multiStop: true
        })
      );

      if (response.success && response.data) {
        return {
          distance: response.data.distance || 0,
          duration: response.data.duration || 0,
          path: response.data.path || stops,
          polyline: response.data.polyline
        };
      }

      // Fallback: calculate sum of distances between consecutive stops
      return this.calculateMultiStopFallback(stops, mode);
    } catch (error) {
      console.error('[RoutingAdapter] Error calculating multi-stop route:', error);
      return this.calculateMultiStopFallback(stops, mode);
    }
  }

  /**
   * Fallback: Calculate straight-line route
   */
  private calculateStraightLineRoute(
    from: Location,
    to: Location,
    mode: TransportMode
  ): { distance: number; duration: number; path: Location[]; polyline?: string } {
    const distanceKm = this.calculateDistance(from, to);
    const speedKmh = mode.avgSpeedKmh || 25;
    const duration = (distanceKm / speedKmh) * 60; // Convert to minutes

    return {
      distance: distanceKm * 1000, // Convert to meters
      duration,
      path: [from, to],
      polyline: undefined
    };
  }

  /**
   * Fallback: Calculate multi-stop route by summing segments
   */
  private calculateMultiStopFallback(
    stops: Location[],
    mode: TransportMode
  ): { distance: number; duration: number; path: Location[]; polyline?: string } {
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < stops.length - 1; i++) {
      const segment = this.calculateStraightLineRoute(stops[i], stops[i + 1], mode);
      totalDistance += segment.distance;
      totalDuration += segment.duration;
    }

    return {
      distance: totalDistance,
      duration: totalDuration,
      path: stops,
      polyline: undefined
    };
  }

  /**
   * Calculate distance using Haversine formula (in km)
   */
  private calculateDistance(from: Location, to: Location): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) *
      Math.cos(this.toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}