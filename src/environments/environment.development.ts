/**
 * Development Environment Configuration
 * Used for local development: ng serve
 */
import { Environment } from './environment.interface';

export const environment: Environment = {
    production: false,
    apiUrl: 'http://localhost:3000/api/v1',
    socketUrl: 'http://localhost:3000',
    appName: 'Along_9ja',
    useMockSockets: false,

    googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',

    storageKeys: {
        token: 'eazyroute_token',
        user: 'eazyroute_user',
        hasSeenOnboarding: 'eazyroute_onboarding_complete',
        favoriteRoutes: 'eazyroute_favorite_routes',
        recentSearches: 'eazyroute_recent_searches'
    },

    geolocation: {
        enabled: true,
        defaultCenter: {
            lat: 9.0765,
            lng: 7.3986
        },
        timeout: 15000,
        maximumAge: 0,
        enableHighAccuracy: true
    }
};