// src/environments/environment.interface.ts

export interface Environment {
    production: boolean;
    apiUrl: string;
    appName: 'EazyRoute';
    useMockSockets?: boolean; // Optional, defaults to false if undefined

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