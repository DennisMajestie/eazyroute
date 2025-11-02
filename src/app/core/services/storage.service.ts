// // src/app/core/services/storage.service.ts
// import { Injectable } from '@angular/core';
// import { environment } from '../../../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class StorageService {
//   private readonly keys = environment.storageKeys;

//   constructor() {}

//   // Generic set method
//   set(key: string, value: any): void {
//     try {
//       const serialized = JSON.stringify(value);
//       localStorage.setItem(key, serialized);
//     } catch (error) {
//       console.error('Error saving to storage:', error);
//     }
//   }

//   // Generic get method
//   get<T>(key: string): T | null {
//     try {
//       const item = localStorage.getItem(key);
//       return item ? JSON.parse(item) : null;
//     } catch (error) {
//       console.error('Error reading from storage:', error);
//       return null;
//     }
//   }

//   // Remove specific item
//   remove(key: string): void {
//     try {
//       localStorage.removeItem(key);
//     } catch (error) {
//       console.error('Error removing from storage:', error);
//     }
//   }

//   // Clear all storage
//   clear(): void {
//     try {
//       localStorage.clear();
//     } catch (error) {
//       console.error('Error clearing storage:', error);
//     }
//   }

//   // Token management
//   setAccessToken(token: string): void {
//     this.set(this.keys.accessToken, token);
//   }

//   getAccessToken(): string | null {
//     return this.get<string>(this.keys.accessToken);
//   }

//   setRefreshToken(token: string): void {
//     this.set(this.keys.refreshToken, token);
//   }

//   getRefreshToken(): string | null {
//     return this.get<string>(this.keys.refreshToken);
//   }

//   removeTokens(): void {
//     this.remove(this.keys.accessToken);
//     this.remove(this.keys.refreshToken);
//   }

//   // User management
//   setUser(user: any): void {
//     this.set(this.keys.user, user);
//   }

//   getUser<T>(): T | null {
//     return this.get<T>(this.keys.user);
//   }

//   removeUser(): void {
//     this.remove(this.keys.user);
//   }

//   // Preferences management
//   setPreferences(preferences: any): void {
//     this.set(this.keys.preferences, preferences);
//   }

//   getPreferences<T>(): T | null {
//     return this.get<T>(this.keys.preferences);
//   }

//   // Check if key exists
//   has(key: string): boolean {
//     return localStorage.getItem(key) !== null;
//   }

//   // Get all keys
//   getAllKeys(): string[] {
//     return Object.keys(localStorage);
//   }

//   // Get storage size (approximate)
//   getStorageSize(): number {
//     let total = 0;
//     for (const key in localStorage) {
//       if (localStorage.hasOwnProperty(key)) {
//         total += localStorage[key].length + key.length;
//       }
//     }
//     return total;
//   }
// }

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    /**
     * Get item from localStorage
     */
    getItem<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            return JSON.parse(item) as T;
        } catch (error) {
            console.error(`Error getting item from storage: ${key}`, error);
            return null;
        }
    }

    /**
     * Set item in localStorage
     */
    setItem<T>(key: string, value: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error setting item in storage: ${key}`, error);
        }
    }

    /**
     * Remove item from localStorage
     */
    removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing item from storage: ${key}`, error);
        }
    }

    /**
     * Clear all items from localStorage
     */
    clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing storage', error);
        }
    }

    /**
     * Check if key exists in localStorage
     */
    hasItem(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }

    // ===== App-specific storage methods =====

    /**
     * Get auth token
     */
    getToken(): string | null {
        return localStorage.getItem(environment.storageKeys.token);
    }

    /**
     * Set auth token
     */
    setToken(token: string): void {
        localStorage.setItem(environment.storageKeys.token, token);
    }

    /**
     * Remove auth token
     */
    removeToken(): void {
        localStorage.removeItem(environment.storageKeys.token);
    }

    /**
     * Get current user
     */
    getUser<T>(): T | null {
        return this.getItem<T>(environment.storageKeys.user);
    }

    /**
     * Set current user
     */
    setUser<T>(user: T): void {
        this.setItem(environment.storageKeys.user, user);
    }

    /**
     * Remove current user
     */
    removeUser(): void {
        this.removeItem(environment.storageKeys.user);
    }

    /**
     * Check if user has seen onboarding
     */
    hasSeenOnboarding(): boolean {
        return this.getItem<boolean>(environment.storageKeys.hasSeenOnboarding) === true;
    }

    /**
     * Mark onboarding as complete
     */
    setOnboardingComplete(): void {
        this.setItem(environment.storageKeys.hasSeenOnboarding, true);
    }

    /**
     * Get favorite routes
     */
    getFavoriteRoutes(): string[] {
        return this.getItem<string[]>(environment.storageKeys.favoriteRoutes) || [];
    }

    /**
     * Set favorite routes
     */
    setFavoriteRoutes(routeIds: string[]): void {
        this.setItem(environment.storageKeys.favoriteRoutes, routeIds);
    }

    /**
     * Add route to favorites
     */
    addFavoriteRoute(routeId: string): void {
        const favorites = this.getFavoriteRoutes();
        if (!favorites.includes(routeId)) {
            favorites.push(routeId);
            this.setFavoriteRoutes(favorites);
        }
    }

    /**
     * Remove route from favorites
     */
    removeFavoriteRoute(routeId: string): void {
        const favorites = this.getFavoriteRoutes();
        const filtered = favorites.filter(id => id !== routeId);
        this.setFavoriteRoutes(filtered);
    }

    /**
     * Check if route is favorite
     */
    isFavoriteRoute(routeId: string): boolean {
        return this.getFavoriteRoutes().includes(routeId);
    }

    /**
     * Get recent searches
     */
    getRecentSearches(): string[] {
        return this.getItem<string[]>(environment.storageKeys.recentSearches) || [];
    }

    /**
     * Add to recent searches
     */
    addRecentSearch(searchTerm: string, maxItems = 10): void {
        const searches = this.getRecentSearches();

        // Remove if already exists
        const filtered = searches.filter(s => s !== searchTerm);

        // Add to beginning
        filtered.unshift(searchTerm);

        // Limit to maxItems
        const limited = filtered.slice(0, maxItems);

        this.setItem(environment.storageKeys.recentSearches, limited);
    }

    /**
     * Clear recent searches
     */
    clearRecentSearches(): void {
        this.removeItem(environment.storageKeys.recentSearches);
    }

    /**
     * Clear all app data (logout cleanup)
     */
    clearAppData(): void {
        this.removeToken();
        this.removeUser();
        // Keep onboarding status and preferences
    }

    /**
     * Get storage size (approximate)
     */
    getStorageSize(): number {
        let size = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                size += localStorage[key].length + key.length;
            }
        }
        return size;
    }

    /**
     * Get storage size in human-readable format
     */
    getStorageSizeFormatted(): string {
        const bytes = this.getStorageSize();
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}