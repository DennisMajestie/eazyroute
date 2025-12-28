import { Environment } from './environment.interface';

export const environment: Environment = {
    production: true,
    apiUrl: 'https://along-backend-lo8n.onrender.com/api/v1',
    socketUrl: 'https://along-backend-lo8n.onrender.com',
    appName: 'Along_9ja',
    useMockSockets: false,
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    appleClientId: 'com.eazyroute.signin-client',

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
