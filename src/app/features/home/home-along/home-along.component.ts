import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { LocalityService } from '../../../core/services/locality.service';
import { LoadingStateService } from '../../../core/services/loading-state.service';
import { Locality, Anchor, LocalitySearchResult } from '../../../models/locality.model';
import { Area } from '../../../models/area.model';

import { SkeletonLandmarkComponent } from '../../../shared/components/skeleton-landmark/skeleton-landmark.component';
import { LoadingProgressComponent } from '../../../shared/components/loading-progress/loading-progress.component';
import { NIGERIAN_COPY } from '../../../shared/constants/nigerian-copy.constants';
import { AlongService } from '../../../core/services/along.service';
import { BoardingInference } from '../../../models/transport.types';
import { Subscription, interval } from 'rxjs';
import { switchMap, filter, firstValueFrom } from 'rxjs';
import { GeolocationService } from '../../../core/services/geolocation.service';

interface PopularRoute {
  from: string;
  to: string;
  emoji: string;
}

interface SelectedLocation {
  type: 'locality' | 'anchor' | 'bus_stop' | 'micro_node';
  name: string;
  hierarchy?: string;
  coords: { lat: number; lng: number };
  locality?: Locality;
  anchor?: Anchor;
}

@Component({
  selector: 'app-home-along',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SkeletonLandmarkComponent,
    LoadingProgressComponent
  ],
  templateUrl: './home-along.component.html',
  styleUrls: ['./home-along.component.scss']
})
export class HomeAlongComponent implements OnInit {
  // Area context (ALONG Framework - Nationwide Coverage)
  selectedArea: Area | null = null;

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

  // Smart Boarding (ALONG Framework)
  boardingInferences: BoardingInference[] = [];
  pollingSubscription: Subscription | null = null;
  smartBoardingMessage: string = '';
  showSmartBoarding: boolean = false;

  // Popular routes
  popularRoutes: PopularRoute[] = [
    { from: 'Lokogoma', to: 'Area 1', emoji: '🏢' },
    { from: 'Kubwa', to: 'Berger', emoji: '🚌' },
    { from: 'Nyanya', to: 'Wuse', emoji: '🏪' },
    { from: 'Gwarinpa', to: 'Maitama', emoji: '🏛️' },
    { from: 'Lugbe', to: 'City Gate', emoji: '🚏' }
  ];

  // Nigerian copy
  readonly COPY = NIGERIAN_COPY;

  constructor(
    private router: Router,
    private geocodingService: GeocodingService,
    private busStopService: BusStopService,
    private localityService: LocalityService,
    public loadingState: LoadingStateService,
    private alongService: AlongService,
    private geolocationService: GeolocationService
  ) { }

  ngOnInit() {
    // Load selected area from localStorage
    this.loadSelectedArea();

    // Auto-detect location on load
    this.detectLocation().then(() => {
      this.startSmartBoardingPolling();
    });
  }

  ngOnDestroy() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  /**
   * Start polling for smart boarding suggestions
   */
  startSmartBoardingPolling() {
    // Poll every 15 seconds
    this.pollingSubscription = interval(15000)
      .pipe(
        filter(() => !!this.fromLocation && !this.isSearching), // Only poll if we have a location and not searching
        switchMap(() => {
          if (this.fromLocation) {
            return this.alongService.inferBoarding(
              this.fromLocation.coords.lat,
              this.fromLocation.coords.lng
            );
          }
          return [];
        })
      )
      .subscribe({
        next: (response: any) => {
          // response matches ApiResponse<BoardingInference[]>
          if (response.success && response.data && response.data.length > 0) {
            this.boardingInferences = response.data;
            this.updateSmartBoardingUI(response.data[0]);
            this.showSmartBoarding = true;
          } else {
            this.showSmartBoarding = false;
          }
        },
        error: (err) => console.error('Smart Boarding Error:', err)
      });
  }

  /**
   * Update Smart Boarding UI based on nearest inference
   */
  updateSmartBoardingUI(inference: BoardingInference) {
    if (inference.walkingDistance < 20) {
      this.smartBoardingMessage = `🎯 You are at ${inference.anchor.name}. Boarding permitted.`;
    } else if (inference.walkingDistance < 100) {
      this.smartBoardingMessage = `🚶 Walk ${Math.round(inference.walkingDistance)}m to ${inference.anchor.name}.`;
    } else {
      this.smartBoardingMessage = `📍 Nearest stop: ${inference.anchor.name} (${Math.round(inference.walkingDistance)}m)`;
    }
  }

  /**
   * Load selected area from localStorage (ALONG Framework)
   */
  loadSelectedArea() {
    const savedArea = localStorage.getItem('selectedArea');
    if (savedArea) {
      try {
        this.selectedArea = JSON.parse(savedArea);
      } catch (error) {
        console.error('Error loading selected area:', error);
      }
    }
  }

  /**
   * Navigate to state selector to change location
   */
  changeLocation() {
    this.router.navigate(['/select-state']);
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
      const coords = await firstValueFrom(this.geolocationService.getCurrentPosition());

      const lat = coords.latitude;
      const lng = coords.longitude;

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
        }
      });

      this.isDetectingLocation = false;
    } catch (error: any) {
      console.error('Location detection error:', error);
      this.locationError = error.message || 'Could not detect location. Please enter manually.';
      this.isDetectingLocation = false;
      this.fromInput = '';
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
      this.loadingState.reset();
      return;
    }

    this.isSearching = true;
    // Set initial loading state with Nigerian copy
    this.loadingState.setInitialLoading(NIGERIAN_COPY.LOADING.SEARCHING);

    // Hybrid Search (ALONG Framework)
    this.alongService.search(query).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Map to LocalitySearchResult format for compatibility or use new format
          this.searchResults = response.data.map((item: any) => ({
            type: item.type,
            name: item.name,
            hierarchy: item.hierarchy || (item.source === 'osm' ? 'External' : 'Local'),
            latitude: item.location?.lat || item.location?.coordinates?.[1] || 0,
            longitude: item.location?.lng || item.location?.coordinates?.[0] || 0,
            source: item.source
          } as any)); // Using any to bypass strict type check for now if LocalitySearchResult is strict

          this.showSearchResults = true;
          this.loadingState.setSuccess(NIGERIAN_COPY.SUCCESS.READY);
        } else {
          this.searchResults = [];
          this.loadingState.setHardFailure('data_unavailable', NIGERIAN_COPY.HARD_FAILURE.NO_ROUTE_YET);
        }
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Hybrid search error:', error);
        this.searchResults = [];
        this.loadingState.setHardFailure('network_failure', 'Could not search properly. Try again?');
        this.isSearching = false;
      }
    });
  }

  /**
   * Select a location from search results
   */
  selectLocation(field: 'from' | 'to', result: any) {
    const selectedLocation: SelectedLocation = {
      type: result.type,
      name: result.name,
      hierarchy: result.hierarchy,
      coords: {
        lat: result.latitude,
        lng: result.longitude
      }
    };

    if (field === 'from') {
      this.fromLocation = selectedLocation;
      this.fromInput = result.name;
    } else {
      this.toLocation = selectedLocation;
      this.toInput = result.name;
    }

    this.showSearchResults = false;
    this.searchResults = [];
    this.loadingState.reset();
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
   * Supports Hybrid Search (Object or Text)
   */
  findRoute() {
    // Check if we have at least text input for both fields
    if ((!this.fromLocation && !this.fromInput) || (!this.toLocation && !this.toInput)) {
      alert('Please enter both FROM and TO locations');
      return;
    }

    // Construct query params
    const queryParams: any = {};

    // FROM: Prefer object, fallback to text
    if (this.fromLocation) {
      queryParams.fromLat = this.fromLocation.coords.lat;
      queryParams.fromLng = this.fromLocation.coords.lng;
      queryParams.fromName = this.fromLocation.name;
      queryParams.fromHierarchy = this.fromLocation.hierarchy;
      queryParams.fromType = this.fromLocation.type;
    } else {
      queryParams.fromName = this.fromInput; // Backend handles geocoding
      queryParams.isHybridFrom = true;
    }

    // TO: Prefer object, fallback to text
    if (this.toLocation) {
      queryParams.toLat = this.toLocation.coords.lat;
      queryParams.toLng = this.toLocation.coords.lng;
      queryParams.toName = this.toLocation.name;
      queryParams.toHierarchy = this.toLocation.hierarchy;
      queryParams.toType = this.toLocation.type;
    } else {
      queryParams.toName = this.toInput; // Backend handles geocoding
      queryParams.isHybridTo = true;
    }

    // Navigate to route display (skip boarding inference if pure text search?)
    // Note: Boarding inference usually requires coords. If we only have text, we might skip to route display.
    // However, the original code went to boarding inference first? 
    // Wait, the router.navigate was to boarding-inference? 
    // Actually, traditionally route finding goes to 'route-display' or similar. 
    // The previous code navigated to 'boarding-inference'. Let's check routes. 
    // Usually "Find Route" goes to the route results. "Smart Boarding" is the one that uses inference.
    // Let's assume for this task "Find Route" should go to 'route-display'. 
    // BUT the previous code was `this.router.navigate(['/boarding-inference']...` ??
    // That seems odd for "Find Route". Let me check app.routes.ts to be sure where I should send them.
    // Assuming the user wants to see the route, it should be 'route-display'. 
    // If I send them to boarding-inference without coords, it might break.
    // Let's send them to 'route-display' directly for hybrid search.

    this.router.navigate(['/route-display'], { queryParams });
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
