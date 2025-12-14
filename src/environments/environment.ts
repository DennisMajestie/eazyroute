// // src/environments/environment.ts export const environment = { production: false, apiUrl: 'http://localhost:3000/api', mapboxToken: 'YOUR_MAPBOX_TOKEN', otpLength: 4, otpExpiry: 300 };

// // src/environments/environment.development.ts
// export const environment = {
//   production: false,

//   // API Configuration
//   apiUrl: 'http://localhost:3000/api/v1',
//   apiVersion: 'v1',
//   apiTimeout: 30000,

//   // Logging (verbose in dev)
//   enableLogging: true,

//   // Cache Configuration
//   cacheTimeout: 60000, // 1 minute (shorter for dev)
//   maxRetries: 3,

//   // Storage Keys (different from prod)
//   storageKeys: {
//     accessToken: 'eazyroute_dev_access_token',
//     refreshToken: 'eazyroute_dev_refresh_token',
//     user: 'eazyroute_dev_user',
//     preferences: 'eazyroute_dev_preferences',
//     recentSearches: 'eazyroute_dev_recent_searches',
//     favoriteRoutes: 'eazyroute_dev_favorite_routes'
//   },

//   // Map Configuration
//   mapboxToken: 'your_mapbox_token_here',
//   googleMapsApiKey: 'your_google_maps_api_key',
//   defaultMapCenter: { lat: 9.0765, lng: 7.3986 },
//   defaultMapZoom: 12,

//   // OTP Configuration (easier for testing)
//   otpLength: 6,
//   otpExpiry: 600,
//   otpResendDelay: 30, // 30 seconds for dev

//   // Feature Flags (enable all for testing)
//   enableTagAlong: true,
//   enablePayments: true, // Enable in dev for testing
//   enablePushNotifications: true,
//   enableGeolocation: true,
//   enableOfflineMode: true,

//   // Search Configuration
//   nearbySearchRadius: 5,
//   maxSearchResults: 20,
//   searchDebounceTime: 300,

//   // Ride Configuration
//   minSeatsPerRide: 1,
//   maxSeatsPerRide: 50,
//   rideCreationLimit: 100, // Higher limit for dev
//   minDepartureNotice: 0, // No restriction in dev

//   // Pagination
//   defaultPageSize: 10,
//   maxPageSize: 100,

//   // App Information
//   appName: 'EazyRoute Dev',
//   appVersion: '1.0.0-dev',
//   appDescription: 'Your smart transportation companion (Development)',
//   supportEmail: 'dev@eazyroute.com',
//   supportPhone: '+234800000000',
//   termsUrl: 'http://localhost:4200/terms',
//   privacyUrl: 'http://localhost:4200/privacy',

//   // Social Links
//   socialLinks: {
//     facebook: 'https://facebook.com/eazyroute',
//     twitter: 'https://twitter.com/eazyroute',
//     instagram: 'https://instagram.com/eazyroute'
//   }
// };
// src/environments/environment.ts (Production)
// src/environments/environment.development.ts (Development)
import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  apiUrl: 'http://localhost:3000/api/v1',
  appName: 'EazyRoute',
  useMockSockets: false, // Backend now supports sockets

  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',

  // Storage keys
  storageKeys: {
    token: 'eazyroute_token',
    user: 'eazyroute_user',
    hasSeenOnboarding: 'eazyroute_onboarding_complete',
    favoriteRoutes: 'eazyroute_favorite_routes',
    recentSearches: 'eazyroute_recent_searches'
  },

  // Geolocation settings
  geolocation: {
    enabled: true,
    defaultCenter: {
      lat: 9.0765, // Abuja, Nigeria
      lng: 7.3986
    },
    timeout: 10000,
    maximumAge: 30000,
    enableHighAccuracy: true
  }
};