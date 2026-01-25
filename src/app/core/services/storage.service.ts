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
/**
 * ═══════════════════════════════════════════════════════════════════
 * STORAGE SERVICE (Using Your Storage Keys)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/services/storage.service.ts
 */

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GeneratedRoute } from '../engines/types/easyroute.types';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    /**
     * Save auth token
     */
    saveToken(token: string): void {
        localStorage.setItem(environment.storageKeys.token, token);
    }

    /**
     * Get auth token
     */
    getToken(): string | null {
        return localStorage.getItem(environment.storageKeys.token);
    }

    /**
     * Remove auth token
     */
    removeToken(): void {
        localStorage.removeItem(environment.storageKeys.token);
    }

    /**
     * Save user data
     */
    saveUser(user: any): void {
        localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));
    }

    /**
     * Get user data
     */
    getUser(): any | null {
        const user = localStorage.getItem(environment.storageKeys.user);
        return user ? JSON.parse(user) : null;
    }

    /**
     * Remove user data
     */
    removeUser(): void {
        localStorage.removeItem(environment.storageKeys.user);
    }

    /**
     * Check if onboarding was completed
     */
    hasSeenOnboarding(): boolean {
        return localStorage.getItem(environment.storageKeys.hasSeenOnboarding) === 'true';
    }

    /**
     * Mark onboarding as completed
     */
    markOnboardingComplete(): void {
        localStorage.setItem(environment.storageKeys.hasSeenOnboarding, 'true');
    }

    /**
     * Save favorite routes
     */
    saveFavoriteRoutes(routes: string[]): void {
        localStorage.setItem(environment.storageKeys.favoriteRoutes, JSON.stringify(routes));
    }

    /**
     * Get favorite routes
     */
    getFavoriteRoutes(): string[] {
        const routes = localStorage.getItem(environment.storageKeys.favoriteRoutes);
        return routes ? JSON.parse(routes) : [];
    }

    /**
     * Add to recent searches
     */
    addRecentSearch(search: string): void {
        const searches = this.getRecentSearches();

        // Remove if already exists
        const filtered = searches.filter(s => s !== search);

        // Add to beginning
        filtered.unshift(search);

        // Keep only last 10
        const limited = filtered.slice(0, 10);

        localStorage.setItem(environment.storageKeys.recentSearches, JSON.stringify(limited));
    }

    /**
     * Get recent searches
     */
    getRecentSearches(): string[] {
        const searches = localStorage.getItem(environment.storageKeys.recentSearches);
        return searches ? JSON.parse(searches) : [];
    }

    /**
     * Clear all app data
     */
    clearAll(): void {
        (Object.values(environment.storageKeys) as string[]).forEach(key => {
            localStorage.removeItem(key);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // IndexedDB Caching (Offline Top Routes)
    // ═══════════════════════════════════════════════════════════════
    private dbPromise: Promise<IDBDatabase> | null = null;

    private openDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open('eazyroute-db', 1);
            request.onupgradeneeded = (event: any) => {
                const db: IDBDatabase = event.target.result;
                if (!db.objectStoreNames.contains('routes')) {
                    const store = db.createObjectStore('routes', { keyPath: 'id' });
                    store.createIndex('userId', 'userId', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return this.dbPromise;
    }

    async cacheTopRoutesForUser(userId: string, routes: GeneratedRoute[]): Promise<void> {
        try {
            const db = await this.openDB();
            const tx = db.transaction('routes', 'readwrite');
            const store = tx.objectStore('routes');
            // Clear previous cache for user
            const index = store.index('userId');
            const toDelete: any[] = [];
            await new Promise<void>((res) => {
                const req = index.openCursor(IDBKeyRange.only(userId));
                req.onsuccess = (ev: any) => {
                    const cursor = ev.target.result;
                    if (cursor) {
                        toDelete.push(cursor.primaryKey);
                        cursor.continue();
                    } else {
                        res();
                    }
                };
                req.onerror = () => res();
            });
            toDelete.forEach(pk => store.delete(pk));
            // Save new top 5
            const top = routes.slice(0, 5);
            const now = Date.now();
            for (const r of top) {
                store.put({ id: `${userId}-${r.id}`, userId, route: r, timestamp: now });
            }
            await new Promise<void>((resolveTx) => {
                tx.oncomplete = () => resolveTx();
                tx.onerror = () => resolveTx();
                tx.onabort = () => resolveTx();
            });
        } catch {
            // Fallback to localStorage
            localStorage.setItem(`routes_cache_${userId}`, JSON.stringify(routes.slice(0, 5)));
        }
    }

    async getCachedTopRoutesForUser(userId: string): Promise<GeneratedRoute[]> {
        try {
            const db = await this.openDB();
            const tx = db.transaction('routes', 'readonly');
            const store = tx.objectStore('routes');
            const index = store.index('userId');
            const results: GeneratedRoute[] = [];
            await new Promise<void>((res) => {
                const req = index.openCursor(IDBKeyRange.only(userId));
                req.onsuccess = (ev: any) => {
                    const cursor = ev.target.result;
                    if (cursor) {
                        results.push(cursor.value.route as GeneratedRoute);
                        cursor.continue();
                    } else {
                        res();
                    }
                };
                req.onerror = () => res();
            });
            return results.slice(0, 5);
        } catch {
            const raw = localStorage.getItem(`routes_cache_${userId}`);
            return raw ? JSON.parse(raw) : [];
        }
    }
}
