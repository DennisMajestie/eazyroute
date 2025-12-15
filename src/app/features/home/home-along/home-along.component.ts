import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { LocalityService } from '../../../core/services/locality.service';
import { Locality, Anchor, LocalitySearchResult } from '../../../models/locality.model';
import { LocalityCardComponent } from '../../../shared/components/locality-card/locality-card.component';
import { HierarchyBreadcrumbComponent } from '../../../shared/components/hierarchy-breadcrumb/hierarchy-breadcrumb.component';

interface PopularRoute {
  from: string;
  to: string;
  emoji: string;
}

interface SelectedLocation {
  type: 'locality' | 'anchor' | 'bus_stop';
  name: string;
  hierarchy?: string;
  coords: { lat: number; lng: number };
  locality?: Locality;
  anchor?: Anchor;
}

@Component({
  selector: 'app-home-along',
  standalone: true,
  imports: [CommonModule, FormsModule, LocalityCardComponent, HierarchyBreadcrumbComponent],
  templateUrl: './home-along.component.html',
  styleUrls: ['./home-along.component.scss']
})
export class HomeAlongComponent implements OnInit {
  // Location state (ALONG Framework)
  fromLocation: SelectedLocation | null = null;
  toLocation: SelectedLocation | null = null;
  fromInput: string = '';
  toInput: string = '';

  // UI state
  isDetectingLocation = false;
  locationError: string = '';
  searchResults: LocalitySearchResult[] = [];
  showSearchResults = false;
  activeField: 'from' | 'to' | null = null;
  isSearching = false;

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
    private busStopService: BusStopService,
    private localityService: LocalityService
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
    this.fromInput = '📍 Detecting your location...';

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

      // Create SelectedLocation object
      const detectedLocation: SelectedLocation = {
        type: 'bus_stop',
        name: `Your Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        coords: { lat, lng }
      };

      this.fromLocation = detectedLocation;
      this.fromInput = detectedLocation.name;

      // Try to get address name
      this.geocodingService.reverseGeocode(lat, lng).subscribe({
        next: (result) => {
          if (result && (result.name || result.area)) {
            const locationName = `📍 ${result.name || result.area}`;
            this.fromLocation = {
              ...detectedLocation,
              name: locationName
            };
            this.fromInput = locationName;
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

      this.fromInput = '';
    } finally {
      this.isDetectingLocation = false;
    }
  }

  /**
   * Search for localities, anchors, and landmarks (ALONG Framework)
   */
  onSearchInput(field: 'from' | 'to', query: string) {
    this.activeField = field;

    if (query.length < 2) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }

    this.isSearching = true;

    // Search localities first (ALONG Framework)
    this.localityService.search(query).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.showSearchResults = true;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Locality search error:', error);
        // Fallback to bus stop search
        this.busStopService.searchStops({ search: query, limit: 10 }).subscribe({
          next: (busStops) => {
            this.searchResults = busStops.map(stop => ({
              type: 'bus_stop' as const,
              id: typeof stop.id === 'number' ? stop.id : parseInt(stop.id as string, 10),
              name: stop.name,
              hierarchy: stop.city || '',
              latitude: stop.latitude,
              longitude: stop.longitude
            }));
            this.showSearchResults = true;
          },
          error: () => {
            this.searchResults = [];
          }
        });
        this.isSearching = false;
      }
    });
  }

  /**
   * Select a search result (ALONG Framework)
   */
  selectLocation(result: LocalitySearchResult) {
    const selected: SelectedLocation = {
      type: result.type as any,
      name: result.name,
      hierarchy: result.hierarchy,
      coords: {
        lat: result.latitude,
        lng: result.longitude
      },
      locality: result.locality,
      anchor: result.anchor
    };

    if (this.activeField === 'from') {
      this.fromLocation = selected;
      this.fromInput = result.name;
    } else if (this.activeField === 'to') {
      this.toLocation = selected;
      this.toInput = result.name;
    }

    this.showSearchResults = false;
    this.searchResults = [];
  }

  /**
   * Select a popular route (ALONG Framework)
   */
  selectPopularRoute(route: PopularRoute) {
    this.fromInput = route.from;
    this.toInput = route.to;

    // Search for localities/anchors
    this.localityService.search(route.from).subscribe({
      next: (results) => {
        if (results.length > 0) {
          this.fromLocation = {
            type: results[0].type as any,
            name: results[0].name,
            hierarchy: results[0].hierarchy,
            coords: {
              lat: results[0].latitude,
              lng: results[0].longitude
            },
            locality: results[0].locality,
            anchor: results[0].anchor
          };
        }
      }
    });

    this.localityService.search(route.to).subscribe({
      next: (results) => {
        if (results.length > 0) {
          this.toLocation = {
            type: results[0].type as any,
            name: results[0].name,
            hierarchy: results[0].hierarchy,
            coords: {
              lat: results[0].latitude,
              lng: results[0].longitude
            },
            locality: results[0].locality,
            anchor: results[0].anchor
          };
        }
      }
    });
  }

  /**
   * Find route (ALONG Framework)
   */
  findRoute() {
    if (!this.fromLocation || !this.toLocation) {
      alert('Please enter both FROM and TO locations');
      return;
    }

    // Navigate to boarding inference or route display
    this.router.navigate(['/boarding-inference'], {
      queryParams: {
        fromLat: this.fromLocation.coords.lat,
        fromLng: this.fromLocation.coords.lng,
        fromName: this.fromLocation.name,
        fromHierarchy: this.fromLocation.hierarchy,
        fromType: this.fromLocation.type,
        toLat: this.toLocation.coords.lat,
        toLng: this.toLocation.coords.lng,
        toName: this.toLocation.name,
        toHierarchy: this.toLocation.hierarchy,
        toType: this.toLocation.type
      }
    });
  }

  /**
   * Clear field
   */
  clearField(field: 'from' | 'to') {
    if (field === 'from') {
      this.fromLocation = null;
      this.fromInput = '';
    } else {
      this.toLocation = null;
      this.toInput = '';
    }
  }

  /**
   * Get type icon for search results
   */
  getTypeIcon(type: string): string {
    const icons = {
      'locality': '🏘️',
      'anchor': '📍',
      'micro_node': '🎯',
      'bus_stop': '🚏'
    };
    return icons[type as keyof typeof icons] || '📍';
  }
}
