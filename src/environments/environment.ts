export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  socketUrl: 'http://localhost:3000',
  mapboxToken: '',
  googleMapsApiKey: '',
  googleClientId: '',
  appName: 'EazyRoute',
  useMockSockets: true,
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
    timeout: 5000,
    maximumAge: 0
  }
};