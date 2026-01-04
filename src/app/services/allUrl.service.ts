import { Injectable } from '@angular/core';

/**
 * AllUrlService
 * Centralized service containing all API endpoints
 * Easy to update and manage from one location
 */

import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class AllUrlService {

  allUrl = {
    // ==================== AUTH ENDPOINTS ====================

    auth: {
      register: API_URL + '/auth/register',
      login: API_URL + '/auth/login',
      logout: API_URL + '/auth/logout',
      verifyOTP: API_URL + '/auth/verify-otp',
      resendOTP: API_URL + '/auth/resend-otp',
      refreshToken: API_URL + '/auth/refresh-token',
      forgotPassword: API_URL + '/auth/forgot-password',
      resetPassword: API_URL + '/auth/reset-password',
    },

    // ==================== USERS ENDPOINTS ====================
    users: {
      profile: API_URL + '/users/profile',
      updateProfile: API_URL + '/users/profile',
      getAll: API_URL + '/users',
      getOne: API_URL + '/users/', // append ID
      deleteAccount: API_URL + '/users/', // append ID
      updateRole: API_URL + '/users/', // append ID + '/role'
      stats: API_URL + '/users/stats',
      toggleStatus: API_URL + '/users/', // append ID + '/status'
      completeOnboarding: API_URL + '/users/onboarding',
    },

    // ==================== ROUTES ENDPOINTS ====================
    routes: {
      create: API_URL + '/routes',
      search: API_URL + '/routes/search',
      find: API_URL + '/routes/find',
      getAll: API_URL + '/routes',
      getOne: API_URL + '/routes/', // append ID
      update: API_URL + '/routes/', // append ID
      delete: API_URL + '/routes/', // append ID

      // 🆕 ROUTE GENERATION ENGINE ENDPOINTS
      generate: API_URL + '/along/generate-route',
      calculateFare: API_URL + '/routes/calculate-fare', // Calculate fare for route
      alternatives: API_URL + '/routes/alternatives', // Get alternative routes
    },

    // ==================== BUS STOPS ENDPOINTS ====================
    busStops: {
      getAll: API_URL + '/bus-stops',
      create: API_URL + '/bus-stops',
      getOne: API_URL + '/bus-stops/', // append ID
      update: API_URL + '/bus-stops/', // append ID
      delete: API_URL + '/bus-stops/', // append ID
      getByCity: API_URL + '/bus-stops/city/', // append city name
      searchNearby: API_URL + '/bus-stops/search/nearby',

      // 🆕 ENHANCED BUS STOP ENDPOINTS
      findOnPath: API_URL + '/bus-stops/find-on-path', // Find stops between two points
      getIntermediate: API_URL + '/bus-stops/intermediate', // Get intermediate stops
    },

    // ==================== 🆕 TRIPS ENDPOINTS (Trip Execution Engine) ====================
    trips: {
      create: API_URL + '/trips', // Start a new trip
      getAll: API_URL + '/trips', // Get all user trips
      getOne: API_URL + '/trips/', // append ID
      getActive: API_URL + '/trips/active', // Get active trip
      update: API_URL + '/trips/', // append ID

      // Trip execution actions
      start: API_URL + '/trips/', // append ID + '/start'
      pause: API_URL + '/trips/', // append ID + '/pause'
      resume: API_URL + '/trips/', // append ID + '/resume'
      complete: API_URL + '/trips/', // append ID + '/complete'
      cancel: API_URL + '/trips/', // append ID + '/cancel'

      // Location tracking
      updateLocation: API_URL + '/trips/', // append ID + '/location'
      checkDeviation: API_URL + '/trips/', // append ID + '/check-deviation'

      // Milestones
      getMilestones: API_URL + '/trips/', // append ID + '/milestones'
      updateMilestone: API_URL + '/trips/', // append ID + '/milestones/' + milestoneId

      // History and stats
      history: API_URL + '/trips/history',
      stats: API_URL + '/trips/stats',
    },

    // ==================== 🆕 REROUTING ENDPOINTS (Rerouting Engine) ====================
    rerouting: {
      checkDeviation: API_URL + '/rerouting/check-deviation', // Check if user is off-route
      generateReroute: API_URL + '/rerouting/generate', // Generate alternative route
      applyReroute: API_URL + '/rerouting/', // append tripId + '/apply'
      declineReroute: API_URL + '/rerouting/', // append tripId + '/decline'
      getRerouteHistory: API_URL + '/rerouting/', // append tripId + '/history'
      getPendingReroute: API_URL + '/rerouting/', // append tripId + '/pending'
    },

    // ==================== 🆕 ROUTING SERVICE ENDPOINTS ====================
    routing: {
      calculateRoute: API_URL + '/routing/calculate', // Calculate route between two points
      getDirections: API_URL + '/routing/directions', // Get turn-by-turn directions
      validatePath: API_URL + '/routing/validate', // Validate a route path
    },

    // ==================== 🆕 FARE CALCULATION ENDPOINTS ====================
    fares: {
      calculate: API_URL + '/fares/calculate', // Calculate fare for a route
      estimateTrip: API_URL + '/fares/estimate', // Estimate trip cost
      getPricing: API_URL + '/fares/pricing', // Get pricing rules
      getHistory: API_URL + '/fares/history', // User's fare history
    },

    // ==================== 🆕 LOCATION SERVICES ====================
    location: {
      getCurrentLocation: API_URL + '/location/current', // Get current location
      calculateDistance: API_URL + '/location/distance', // Calculate distance between points
      reverseGeocode: API_URL + '/location/reverse-geocode', // Get address from coordinates
      geocode: API_URL + '/location/geocode', // Get coordinates from address
    },

    // ==================== 🆕 NOTIFICATIONS ENDPOINTS ====================
    notifications: {
      getAll: API_URL + '/notifications',
      markAsRead: API_URL + '/notifications/', // append ID + '/read'
      markAllAsRead: API_URL + '/notifications/read-all',
      delete: API_URL + '/notifications/', // append ID

      // Push notification settings
      updateSettings: API_URL + '/notifications/settings',
      registerDevice: API_URL + '/notifications/register-device',
      unregisterDevice: API_URL + '/notifications/unregister-device',
    },

    // ==================== TAG-ALONG RIDES ENDPOINTS ====================
    tagAlongRides: {
      getAll: API_URL + '/tag-along',
      create: API_URL + '/tag-along',
      getOne: API_URL + '/tag-along/', // append ID
      update: API_URL + '/tag-along/', // append ID
      delete: API_URL + '/tag-along/', // append ID
      join: API_URL + '/tag-along/', // append ID + '/join'
      leave: API_URL + '/tag-along/', // append ID + '/leave'
    },

    // ==================== HEALTH CHECK ====================
    health: {
      check: environment.socketUrl + '/health',
    },
  };

  constructor() { }

  /**
   * Get all URL object
   */
  getAllUrls() {
    return this.allUrl;
  }

  /**
   * Get specific endpoint category
   */
  getEndpoints(category: keyof typeof this.allUrl) {
    return this.allUrl[category];
  }

  /**
   * Log all available endpoints (for development/debugging)
   */
  logAllEndpoints(): void {
    console.log('=== ALL API ENDPOINTS ===', this.allUrl);
  }

  /**
   * 🆕 Helper: Build URL with ID
   */
  buildUrl(baseUrl: string, id: string | number): string {
    return `${baseUrl}${id}`;
  }

  /**
   * 🆕 Helper: Build URL with multiple path segments
   */
  buildUrlPath(baseUrl: string, ...segments: (string | number)[]): string {
    return baseUrl + segments.join('/');
  }
}
