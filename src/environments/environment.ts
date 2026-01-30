export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  socketUrl: 'http://localhost:3000',
  mapboxToken: '',
  googleMapsApiKey: '',
  googleClientId: '',
  appName: 'EazyRoute',
  useMockSockets: true,
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
    timeout: 5000,
    maximumAge: 0
  }
};