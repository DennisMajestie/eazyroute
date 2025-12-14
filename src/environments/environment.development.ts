// src/environments/environment.development.ts (Development)
import { Environment } from './environment.interface';

export const environment: Environment = {
    production: false,
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