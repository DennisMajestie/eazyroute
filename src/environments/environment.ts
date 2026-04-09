export const environment = {
  production: false,
  apiUrl: 'https://along-backend-lo8n.onrender.com/api/v1',
  socketUrl: 'https://along-backend-lo8n.onrender.com',
  mapboxToken: '',
  googleMapsApiKey: '',
  googleClientId: '',
  appName: 'EazyRoute',
  useMockSockets: true,
  useMockAdminData: true,
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
    timeout: 15000,
    maximumAge: 0,
    locationUpdateIntervalMs: 10000
  }
};