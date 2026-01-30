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
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
    }
};
