export const environment = {
    production: true,
    apiUrl: 'https://eazyroute-backend.onrender.com',
    socketUrl: 'https://eazyroute-backend.onrender.com',
    mapboxToken: 'pk.eyJ1IjoiYWxvbmcxIiwiYSI6ImNta3RnM2w0bTFldzEzZnM2czJyNjEycGgifQ.sw1fIIWtx_HpnlEpqTwlrQ',
    googleMapsApiKey: '',
    googleClientId: '',
    appName: 'EazyRoute',
    useMockSockets: false,
    storageKeys: {
        token: 'auth_token',
        user: 'auth_user',
        hasSeenOnboarding: 'onboarding_completed',
        favoriteRoutes: 'favorite_routes',
        recentSearches: 'recent_searches'
    },
    geolocation: {
        enabled: true,
        defaultCenter: {
            lat: 9.0765,
            lng: 7.3986
        },
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
    }
};
