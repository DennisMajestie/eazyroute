import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { BusStopService } from '../../../core/services/bus-stop.service';

interface PopularRoute {
  from: string;
  to: string;
  emoji: string;
}

@Component({
  selector: 'app-home-along',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-along.component.html',
  styleUrls: ['./home-along.component.scss']
})
export class HomeAlongComponent implements OnInit {
  // Location state
  fromLocation: string = '';
  toLocation: string = '';
  fromCoords: { lat: number; lng: number } | null = null;
  toCoords: { lat: number; lng: number } | null = null;

  // UI state
  isDetectingLocation = false;
  locationError: string = '';
  searchResults: any[] = [];
  showSearchResults = false;
  activeField: 'from' | 'to' | null = null;

  // Popular routes
  popularRoutes: PopularRoute[] = [
    { from: 'Lokogoma', to: 'Area 1', emoji: '🏢' },
    { from: 'Kubwa', to: 'Berger', emoji: '🚌' },
    { from: 'Nyanya', to: 'Wuse', emoji: '🏪' },
    { from: 'Gwarinpa', to: 'Maitama', emoji: '🏛️' },
    { from: 'Lugbe', to: 'City Gate', emoji: '🚏' }
  ];

  constructor(
    private router: Router,
    private geocodingService: GeocodingService,
    private busStopService: BusStopService
  ) { }

  ngOnInit() {
    // Auto-detect location on load (optional)
    // this.detectLocation();
  }

  /**
   * Detect user's current location
   */
  async detectLocation() {
    if (this.isDetectingLocation) return;

    this.isDetectingLocation = true;
    this.locationError = '';
    this.fromLocation = '📍 Detecting your location...';

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      this.fromCoords = { lat, lng };
      this.fromLocation = `📍 Your Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      // Try to get address name
      this.geocodingService.reverseGeocode(lat, lng).subscribe({
        next: (result) => {
          if (result && (result.name || result.area)) {
            this.fromLocation = `📍 ${result.name || result.area}`;
          }
        },
        error: () => {
          // Keep coordinates if reverse geocoding fails
        }
      });

    } catch (error: any) {
      console.error('Location detection error:', error);

      if (error.code === 1) {
        this.locationError = 'Location access denied. Please enable location in your browser settings.';
      } else if (error.code === 2) {
        this.locationError = 'Location unavailable. Please check your device settings.';
      } else if (error.code === 3) {
        this.locationError = 'Location request timed out. Please try again.';
      } else {
        this.locationError = 'Could not detect location. Please enter manually.';
      }

      this.fromLocation = '';
    } finally {
      this.isDetectingLocation = false;
    }
  }

  /**
   * Search for landmarks/locations
   */
  onSearchInput(field: 'from' | 'to', query: string) {
    this.activeField = field;

    if (query.length < 2) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }

    // Search bus stops/landmarks
    this.busStopService.searchStops({ search: query, limit: 10 }).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.showSearchResults = true;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.searchResults = [];
      }
    });
  }

  /**
   * Select a search result
   */
  selectLocation(result: any) {
    if (this.activeField === 'from') {
      this.fromLocation = result.name;
      this.fromCoords = {
        lat: result.latitude,
        lng: result.longitude
      };
    } else if (this.activeField === 'to') {
      this.toLocation = result.name;
      this.toCoords = {
        lat: result.latitude,
        lng: result.longitude
      };
    }

    this.showSearchResults = false;
    this.searchResults = [];
  }

  /**
   * Select a popular route
   */
  selectPopularRoute(route: PopularRoute) {
    this.fromLocation = route.from;
    this.toLocation = route.to;

    // Search for coordinates
    this.busStopService.searchStops({ search: route.from, limit: 1 }).subscribe({
      next: (results) => {
        if (results.length > 0) {
          this.fromCoords = {
            lat: results[0].latitude,
            lng: results[0].longitude
          };
        }
      }
    });

    this.busStopService.searchStops({ search: route.to, limit: 1 }).subscribe({
      next: (results) => {
        if (results.length > 0) {
          this.toCoords = {
            lat: results[0].latitude,
            lng: results[0].longitude
          };
        }
      }
    });
  }

  /**
   * Find route
   */
  findRoute() {
    if (!this.fromLocation || !this.toLocation) {
      alert('Please enter both FROM and TO locations');
      return;
    }

    if (!this.fromCoords || !this.toCoords) {
      alert('Please select valid locations from the search results');
      return;
    }

    // Navigate to route display with query params
    this.router.navigate(['/trip-planner'], {
      queryParams: {
        fromLat: this.fromCoords.lat,
        fromLng: this.fromCoords.lng,
        fromName: this.fromLocation,
        toLat: this.toCoords.lat,
        toLng: this.toCoords.lng,
        toName: this.toLocation
      }
    });
  }

  /**
   * Clear field
   */
  clearField(field: 'from' | 'to') {
    if (field === 'from') {
      this.fromLocation = '';
      this.fromCoords = null;
    } else {
      this.toLocation = '';
      this.toCoords = null;
    }
  }
}
