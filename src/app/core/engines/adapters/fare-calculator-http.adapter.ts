// src/app/core/engines/adapters/fare-calculator-http.adapter.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IFareCalculator, RouteSegment, GeneratedRoute, TransportMode } from '../types/easyroute.types';
import { AllUrlService } from '../../../services/allUrl.service';

@Injectable({
  providedIn: 'root'
})
export class FareCalculatorHttpAdapter implements IFareCalculator {
  private urls: any;

  // Fallback pricing (in Naira)
  private readonly BASE_FARES = {
    walk: 0,
    bus: 100,
    keke: 50,
    taxi: 200,
    okada: 100
  };

  private readonly PER_KM_RATES = {
    walk: 0,
    bus: 20,
    keke: 30,
    taxi: 100,
    okada: 50
  };

  constructor(
    private http: HttpClient,
    private urlService: AllUrlService
  ) {
    this.urls = this.urlService.getAllUrls();
  }
  calculateFare(distance: number, mode: TransportMode): number {
    throw new Error('Method not implemented.');
  }
  estimateTotalFare(route: GeneratedRoute): number {
    throw new Error('Method not implemented.');
  }

  /**
   * Calculate fare for a single segment
   */
  calculateSegmentFare(segment: RouteSegment): number {
    try {
      const modeType = segment.mode.type as keyof typeof this.BASE_FARES;
      const baseFare = this.BASE_FARES[modeType] || 0;
      const perKmRate = this.PER_KM_RATES[modeType] || 0;
      const distanceKm = segment.distance / 1000;

      return baseFare + (perKmRate * distanceKm);
    } catch (error) {
      console.error('[FareCalculator] Error calculating segment fare:', error);
      return 0;
    }
  }

  /**
   * Calculate total fare for entire route
   */
  calculateRouteFare(route: GeneratedRoute): number {
    try {
      return route.segments.reduce((total, segment) => {
        return total + this.calculateSegmentFare(segment);
      }, 0);
    } catch (error) {
      console.error('[FareCalculator] Error calculating route fare:', error);
      return 0;
    }
  }

  /**
   * Get fare estimate from backend
   */
  async estimateFare(
    distance: number,
    modeType: string
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(this.urls.fares.estimate, {
          distance,
          modeType
        })
      );

      if (response.success && response.data?.estimatedFare) {
        return response.data.estimatedFare;
      }

      // Fallback to local calculation
      const mode = modeType as keyof typeof this.BASE_FARES;
      const baseFare = this.BASE_FARES[mode] || 0;
      const perKmRate = this.PER_KM_RATES[mode] || 0;
      const distanceKm = distance / 1000;

      return baseFare + (perKmRate * distanceKm);
    } catch (error) {
      console.error('[FareCalculator] Error estimating fare from API:', error);

      // Fallback calculation
      const mode = modeType as keyof typeof this.BASE_FARES;
      const baseFare = this.BASE_FARES[mode] || 0;
      const perKmRate = this.PER_KM_RATES[mode] || 0;
      const distanceKm = distance / 1000;

      return baseFare + (perKmRate * distanceKm);
    }
  }

  /**
   * Get pricing rules from backend
   */
  async getPricingRules(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>(this.urls.fares.getPricing)
      );

      if (response.success && response.data) {
        return response.data;
      }

      return {
        baseFares: this.BASE_FARES,
        perKmRates: this.PER_KM_RATES
      };
    } catch (error) {
      console.error('[FareCalculator] Error getting pricing rules:', error);
      return {
        baseFares: this.BASE_FARES,
        perKmRates: this.PER_KM_RATES
      };
    }
  }

  /**
   * Calculate fare with discount
   */
  calculateWithDiscount(
    baseFare: number,
    discountPercent: number
  ): number {
    return baseFare * (1 - discountPercent / 100);
  }
}