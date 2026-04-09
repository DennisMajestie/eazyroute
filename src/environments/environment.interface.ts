// src/environments/environment.interface.ts

export interface Environment {
    production: boolean;
    apiUrl: string;
    appName: 'Along_9ja' | 'EazyRoute' | string;
    useMockAdminData?: boolean;
    useMockSockets?: boolean;
    socketUrl?: string;
    mapboxToken?: string;
    googleClientId?: string;
    appleClientId?: string;

    googleMapsApiKey: string;

    storageKeys: {
        token: string;
        user: string;
        hasSeenOnboarding: string;
        favoriteRoutes: string;
        recentSearches: string;
    };

    geolocation: {
        enabled: boolean;
        defaultCenter: {
            lat: number;
            lng: number;
        };
        timeout: number;
        maximumAge: number;
        enableHighAccuracy: boolean;
    };
}