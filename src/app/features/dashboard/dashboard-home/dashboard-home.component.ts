/**
 * ═══════════════════════════════════════════════════════════════════
 * DASHBOARD COMPONENT - Full API Integration + Real User Name
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/features/dashboard/dashboard-home/dashboard-home.component.ts
 */

import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Import services
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/user.model';
import { EasyrouteOrchestratorService } from '../../../core/services/easyroute-orchestrator.service';
import { TripHttpService } from '../../../core/services/trip-http.service';
import { BusStopHttpService } from '../../../core/services/bus-stop-http.service';
import { RouteHttpService } from '../../../core/services/route-http.service';
import { TagAlongService } from '../../../core/services/tag-along.service';
import { EventService, EasyRouteEvent } from '../../../core/services/event.service';
import { environment } from '../../../../environments/environment';

interface BusStop {
  id: string;
  name: string;
  distance: string;
  routes: string[];
  nextBus: string;
  status: 'active' | 'busy' | 'quiet';
  latitude?: number;
  longitude?: number;
}

interface Route {
  id: string;
  name: string;
  from: string;
  to: string;
  duration: string;
  fare: string;
  buses: number;
  trending: boolean;
  fromLocation?: { latitude: number; longitude: number };
  toLocation?: { latitude: number; longitude: number };
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  image: string;
  attending: number;
}

interface TagAlongRide {
  id: string;
  driver: string;
  avatar: string;
  from: string;
  to: string;
  departureTime: string;
  seats: number;
  price: string;
  rating: number;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss']
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ✅ USER INFO FROM AUTH SERVICE
  userName = 'Guest';
  userFullName = 'Guest';
  userFirstName = 'Guest';
  userAvatar: string | null = null;
  userEmail = '';
  currentUser: User | null = null;

  searchQuery = '';
  searchSubject = new Subject<string>();
  searchResults: any[] = [];
  activeTab: 'routes' | 'events' | 'rides' = 'routes';
  greeting = 'Good Morning';

  // Loading states
  isLoadingStops = false;
  isLoadingRoutes = false;
  isLoadingTrip = false;

  // EasyRoute integration
  hasActiveTrip = false;
  activeTripDestination = '';
  activeTripProgress = 0;
  activeTripId: string | null = null;
  orchestratorState$: any;

  // Current user location
  currentUserLocation: { latitude: number; longitude: number } | null = null;

  // Data arrays
  nearbyStops: BusStop[] = [];
  popularRoutes: Route[] = [];
  upcomingEvents: Event[] = [];
  tagAlongRides: TagAlongRide[] = [];

  constructor(
    public authService: AuthService,  // ✅ Auth service for user info
    private orchestrator: EasyrouteOrchestratorService,
    private tripHttpService: TripHttpService,
    private busStopHttpService: BusStopHttpService,
    private routeHttpService: RouteHttpService,
    private tagAlongService: TagAlongService,
    private eventService: EventService,
    private router: Router
  ) {
    this.orchestratorState$ = this.orchestrator.state$;

    // Search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim().length > 2) {
        this.performSearch(query);
      } else {
        this.searchResults = [];
      }
    });

    // ✅ React to user changes with Angular effect
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.updateUserInfo(user);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.updateGreeting();
    this.loadUserInfo();  // ✅ Load user info first

    // Get user location
    await this.getCurrentLocation();


    // Load data from APIs
    await this.loadNearbyStops();
    await this.loadPopularRoutes();
    this.loadTagAlongRides();
    this.loadUpcomingEvents();

    // Check for active trip
    await this.checkActiveTrip();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * USER MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   */

  private loadUserInfo(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.updateUserInfo(user);
          console.log('[Dashboard] User loaded:', this.userName);
        } else {
          this.resetUserInfo();
        }
      });

    // Get initial user from signal
    const user = this.authService.currentUser();
    if (user) {
      this.updateUserInfo(user);
    }

    // Optional: Refresh user data from server
    if (this.authService.isUserAuthenticated()) {
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          console.log('[Dashboard] User profile refreshed');
        },
        error: (error) => {
          console.error('[Dashboard] Error loading user:', error);
        }
      });
    }
  }

  private updateUserInfo(user: User): void {
    this.currentUser = user;
    this.userFirstName = user.firstName || 'Guest';
    this.userName = user.firstName || 'Guest';
    this.userFullName = `${user.firstName} ${user.lastName}`.trim() || 'User';
    this.userEmail = user.email || '';
    // this.userAvatar = user.avatar || null;
  }

  private resetUserInfo(): void {
    this.currentUser = null;
    this.userName = 'Guest';
    this.userFullName = 'Guest';
    this.userFirstName = 'Guest';
    this.userAvatar = null;
    this.userEmail = '';
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'G';
    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout().subscribe({
        next: () => {
          console.log('Logged out successfully');
        },
        error: (error) => {
          console.error('Logout error:', error);
          this.router.navigate(['/auth/login']);
        }
      });
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * GEOLOCATION
   * ═══════════════════════════════════════════════════════════════
   */

  private async getCurrentLocation(): Promise<void> {
    try {
      if (!environment.geolocation.enabled) {
        console.warn('[Dashboard] Geolocation disabled in environment');
        this.currentUserLocation = {
          latitude: environment.geolocation.defaultCenter.lat,
          longitude: environment.geolocation.defaultCenter.lng
        };
        return;
      }

      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: environment.geolocation.enableHighAccuracy,
              timeout: environment.geolocation.timeout,
              maximumAge: environment.geolocation.maximumAge
            }
          );
        });

        this.currentUserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        console.log('[Dashboard] Current location:', this.currentUserLocation);
      } else {
        this.currentUserLocation = {
          latitude: environment.geolocation.defaultCenter.lat,
          longitude: environment.geolocation.defaultCenter.lng
        };
        console.warn('[Dashboard] Geolocation not available, using default');
      }
    } catch (error: any) {
      if (error.code === 1) { // 1 = User Denied
        console.warn('[Dashboard] User denied geolocation. Using default location (Abuja).');
      } else {
        console.warn('[Dashboard] Geolocation error:', error.message);
      }

      this.currentUserLocation = {
        latitude: environment.geolocation.defaultCenter.lat,
        longitude: environment.geolocation.defaultCenter.lng
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * API DATA LOADING
   * ═══════════════════════════════════════════════════════════════
   */

  private async loadNearbyStops(): Promise<void> {
    if (!this.currentUserLocation) return;

    this.isLoadingStops = true;

    try {
      const response = await this.busStopHttpService.getNearbyStops(
        this.currentUserLocation.latitude,
        this.currentUserLocation.longitude,
        5000
      ).toPromise();

      if (response?.success && response.data) {
        this.nearbyStops = response.data.map((stop: any) => ({
          id: stop._id || stop.id,
          name: stop.name,
          distance: this.calculateDistance(stop.location),
          routes: stop.routes || [],
          nextBus: this.estimateNextBus(),
          status: this.determineStopStatus(stop),
          latitude: stop.location?.coordinates?.[1] || stop.latitude,
          longitude: stop.location?.coordinates?.[0] || stop.longitude
        }));

        console.log('[Dashboard] Loaded nearby stops:', this.nearbyStops.length);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading nearby stops:', error);
    } finally {
      this.isLoadingStops = false;
    }
  }

  private async loadPopularRoutes(): Promise<void> {
    this.isLoadingRoutes = true;

    try {
      const response = await this.routeHttpService.getPopularRoutes().toPromise();

      if (response?.success && response.data) {
        this.popularRoutes = response.data.map((route: any) => ({
          id: route._id || route.id,
          name: route.name,
          from: route.origin?.name || 'Unknown',
          to: route.destination?.name || 'Unknown',
          duration: this.formatDuration(route.estimatedDuration || 0),
          fare: this.formatFare(route.fare || 0),
          buses: 0,
          trending: false,
        }));

        console.log('[Dashboard] Loaded popular routes:', this.popularRoutes.length);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading popular routes:', error);
      this.loadMockRoutes();
    } finally {
      this.isLoadingRoutes = false;
    }
  }

  private loadTagAlongRides(): void {
    this.tagAlongService.getAvailableRides({ limit: 3 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.tagAlongRides = res.data.map(ride => ({
            id: ride._id,
            driver: `${ride.createdBy.firstName} ${ride.createdBy.lastName}`,
            avatar: ride.createdBy.profilePicture || 'assets/default-avatar.png',
            from: ride.origin,
            to: ride.destination,
            departureTime: new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            seats: ride.availableSeats,
            price: `₦${ride.pricePerSeat}`,
            rating: ride.createdBy.rating || 5.0
          }));
        }
      },
      error: (err) => console.error('Failed to load rides', err)
    });
  }

  private loadUpcomingEvents(): void {
    this.eventService.getFeaturedEvents().subscribe({
      next: (events) => {
        this.upcomingEvents = events.map(evt => ({
          id: evt.id,
          title: evt.title,
          date: new Date(evt.schedule.start).toLocaleDateString(),
          time: new Date(evt.schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: evt.venue.name,
          category: evt.eventType,
          image: 'assets/event-placeholder.jpg', // Placeholder
          attending: evt.stats.registeredGuests
        }));
      },
      error: (err) => console.error('Failed to load events', err)
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * ACTIVE TRIP MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   */

  private async checkActiveTrip(): Promise<void> {
    try {
      const response = await this.tripHttpService.getActiveTrip().toPromise();

      if (response?.success && response.data) {
        const activeTrip = response.data;
        this.hasActiveTrip = true;
        this.activeTripId = activeTrip._id || activeTrip.id;

        if (activeTrip.selectedRoute?.segments) {
          const lastSegment = activeTrip.selectedRoute.segments[
            activeTrip.selectedRoute.segments.length - 1
          ];
          this.activeTripDestination = lastSegment?.toStop?.name || 'Unknown';
        }

        this.activeTripProgress = this.calculateTripProgress(activeTrip);
        console.log('[Dashboard] Active trip found:', this.activeTripId);
      } else {
        this.hasActiveTrip = false;
      }
    } catch (error) {
      console.error('[Dashboard] Error checking active trip:', error);
      this.hasActiveTrip = false;
    }

    this.orchestrator.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.hasActiveTrip = state.hasActiveTrip;
        if (state.hasActiveTrip) {
          const tripState = this.orchestrator.getCurrentTripState();
          if (tripState) {
            const lastSegment = tripState.selectedRoute.segments[
              tripState.selectedRoute.segments.length - 1
            ];
            this.activeTripDestination = lastSegment.toStop.name;
            this.activeTripProgress = this.orchestrator.getTripProgress();
          }
        }
      });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * TRIP PLANNING
   * ═══════════════════════════════════════════════════════════════
   */

  showTripPlanner(): void {
    this.router.navigate(['/trip-planner']);
  }

  async planTripFromRoute(route: Route): Promise<void> {
    console.log('[Dashboard] Planning trip from route:', route);

    if (route.fromLocation && route.toLocation) {
      this.router.navigate(['/trip-planner'], {
        state: {
          fromLocation: route.fromLocation,
          toLocation: route.toLocation,
          fromName: route.from,
          toName: route.to
        }
      });
    } else {
      this.router.navigate(['/trip-planner'], {
        queryParams: {
          from: route.from,
          to: route.to
        }
      });
    }
  }

  viewActiveTrip(): void {
    if (this.hasActiveTrip) {
      this.router.navigate(['/trip-tracking']);
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * HELPER METHODS
   * ═══════════════════════════════════════════════════════════════
   */

  updateGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Good Morning';
    } else if (hour < 17) {
      this.greeting = 'Good Afternoon';
    } else {
      this.greeting = 'Good Evening';
    }
  }

  private calculateDistance(stopLocation: any): string {
    if (!this.currentUserLocation || !stopLocation) return 'N/A';

    const lat1 = this.currentUserLocation.latitude;
    const lon1 = this.currentUserLocation.longitude;
    const lat2 = stopLocation.coordinates?.[1] || stopLocation.latitude;
    const lon2 = stopLocation.coordinates?.[0] || stopLocation.longitude;

    if (!lat2 || !lon2) return 'N/A';

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  }

  private estimateNextBus(): string {
    const mins = Math.floor(Math.random() * 15) + 3;
    return `${mins} mins`;
  }

  private determineStopStatus(stop: any): 'active' | 'busy' | 'quiet' {
    const activeBuses = stop.activeBuses || 0;
    if (activeBuses > 5) return 'busy';
    if (activeBuses > 2) return 'active';
    return 'quiet';
  }

  private formatDuration(minutes: number | null | undefined): string {
    if (minutes == null || isNaN(minutes) || minutes <= 0) {
      return '0 mins';
    }
    if (minutes < 60) {
      return `${Math.round(minutes)} mins`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  }

  private formatFare(amount: number | null | undefined): string {
    if (amount == null || isNaN(amount)) {
      return '₦0';
    }
    return `₦${Math.round(amount)}`;
  }

  private calculateTripProgress(trip: any): number {
    if (!trip.currentSegmentIndex || !trip.selectedRoute?.segments) return 0;
    const current = trip.currentSegmentIndex;
    const total = trip.selectedRoute.segments.length;
    return Math.round((current / total) * 100);
  }

  private loadMockRoutes(): void {
    this.popularRoutes = [
      {
        id: '1',
        name: 'Kubwa - Berger',
        from: 'Kubwa',
        to: 'Berger',
        duration: '45 mins',
        fare: '₦300',
        buses: 12,
        trending: true
      }
    ];
  }

  onSearch(): void {
    console.log('[Dashboard] Searching for:', this.searchQuery);
    if (this.searchQuery.trim()) {
      this.router.navigate(['/trip-planner'], {
        queryParams: { to: this.searchQuery }
      });
    }
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  performSearch(query: string): void {
    this.busStopHttpService.searchBusStops(query).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.searchResults = res.data;
        }
      },
      error: (err) => console.error('Search failed', err)
    });
  }

  selectResult(result: any): void {
    this.searchQuery = result.name;
    this.searchResults = [];
    this.router.navigate(['/trip-planner'], {
      queryParams: {
        to: result.name,
        lat: result.location.coordinates[1],
        lng: result.location.coordinates[0]
      }
    });
  }

  setActiveTab(tab: 'routes' | 'events' | 'rides'): void {
    this.activeTab = tab;
  }

  viewBusStop(stop: BusStop): void {
    console.log('[Dashboard] Viewing bus stop:', stop);
  }

  viewRoute(route: Route): void {
    console.log('[Dashboard] Viewing route:', route);
    this.planTripFromRoute(route);
  }

  viewEvent(event: Event): void {
    console.log('[Dashboard] Viewing event:', event);
  }

  bookRide(ride: TagAlongRide): void {
    console.log('[Dashboard] Booking ride:', ride);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#10B981';
      case 'busy': return '#F59E0B';
      case 'quiet': return '#6B7280';
      default: return '#6B7280';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'busy': return 'Busy';
      case 'quiet': return 'Quiet';
      default: return 'Unknown';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}