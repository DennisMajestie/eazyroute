/**
 * Auth Service - Signal-based State Management
 * Refactored to use Angular Signals exclusively (no BehaviorSubjects)
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, of, throwError, timer } from 'rxjs';
import { catchError, map, tap, finalize, retryWhen, mergeMap, take } from 'rxjs/operators';

import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
    User,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    OTPVerifyRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    SocialAuthRequest
} from '../../models/user.model';
import { TripHttpService } from './trip-http.service';
import { ActiveTripPromptService, ActiveTripPromptData, ActiveTripPromptChoice } from './active-trip-prompt.service';
import { getPostLoginRoute, shouldPromptActiveTripOnDashboard } from '../utils/post-login-flow.utils';

declare var google: any;

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_URL = `${environment.apiUrl}/auth`;

    // ═══════════════════════════════════════════════════════════════
    // STATE - Angular Signals (Single Source of Truth)
    // ═══════════════════════════════════════════════════════════════

    /** Current authenticated user */
    readonly currentUser = signal<User | null>(null);

    /** Authentication status */
    readonly isAuthenticated = signal<boolean>(false);

    /** Computed: Check if user is admin */
    readonly isAdmin = computed(() => {
        const user = this.currentUser();
        // 1. Check real role from backend
        const isRealAdmin = user?.role === 'admin' || user?.userType === 'admin' || (user as any)?.isAdmin === true;
        
        // 2. Allow mock admin access ONLY if configured in environment (Localhost)
        if (environment.useMockAdminData) {
            return true;
        }

        return isRealAdmin;
    });

    /** Computed: User's full name */
    readonly userFullName = computed(() => {
        const user = this.currentUser();
        if (!user) return 'Guest';
        return `${user.firstName} ${user.lastName}`.trim() || 'User';
    });

    /** Computed: User's first name */
    readonly userFirstName = computed(() => {
        return this.currentUser()?.firstName || 'Guest';
    });

    constructor(
        private http: HttpClient,
        private router: Router,
        private tripHttpService: TripHttpService,
        private activeTripPromptService: ActiveTripPromptService
    ) {
        this.loadUserFromStorage();
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    private loadUserFromStorage(): void {
        const token = localStorage.getItem(environment.storageKeys.token);
        const userJson = localStorage.getItem(environment.storageKeys.user);

        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);
                this.currentUser.set(user);
                this.isAuthenticated.set(true);
                            } catch (error) {
                console.error('[Auth] Error parsing stored user:', error);
                this.clearAuth();
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTHENTICATION METHODS
    // ═══════════════════════════════════════════════════════════════

    register(data: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/register`, data)
            .pipe(
                tap(response => {
                    if (response.success) {
                        const token = response.token || response.data?.token || (response.data as any)?.accessToken;
                        const user = response.user || response.data?.user;
                        
                        if (token && user) {
                                                        this.handleAuth(response);
                        } else {
                            this.router.navigate(['/auth/verify-otp'], {
                                queryParams: { email: data.email, fromRegistration: 'true' }
                            });
                        }
                    }
                })
            );
    }

    verifyOTP(data: OTPVerifyRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/verify-otp`, data)
            .pipe(tap(response => this.handleAuth(response)));
    }

    resendOTP(data: { email: string }): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/resend-otp`, data);
    }

    login(credentials: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)
            .pipe(
                tap(response => {
                    this.handleAuth(response);
                })
            );
    }


    /**
     * Google Sign-In Implementation
     * Note: Requires the Google Identity Services SDK in index.html
     */
    loginWithGoogle(): void {
        if (typeof google === 'undefined') {
            console.error('[Auth] Google SDK not loaded');
            return;
        }

        google.accounts.id.initialize({
            client_id: environment.googleClientId,
            callback: (response: any) => {
                this.handleSocialAuth('google', response.credential).subscribe({
                    next: (res) => void 0,
                    error: (err) => console.error('[Auth] Google login failed', err)
                });
            },
            auto_select: false,
            cancel_on_tap_outside: true
        });

        google.accounts.id.prompt();
    }

    /**
     * Apple Sign-In Implementation
     * Note: Requires Apple Developer setup and JS SDK in index.html
     */
    loginWithApple(): void {
        console.warn('[Auth] Apple Sign-In requested - requires developer account setup');
        // Implementation for Apple JS SDK would go here
        // window.AppleID.auth.signIn();
    }

    /**
     * Exchange social provider token for backend JWT
     */
    handleSocialAuth(provider: 'google' | 'apple', token: string): Observable<AuthResponse> {
        const payload: SocialAuthRequest = { provider, token };

        return this.http.post<AuthResponse>(`${this.API_URL}/social`, payload)
            .pipe(tap(response => this.handleAuth(response)));
    }

    forgotPassword(data: PasswordResetRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/forgot-password`, data);
    }

    resetPassword(data: PasswordResetConfirm): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/reset-password`, data)
            .pipe(tap(response => {
                if (response.success) {
                    this.router.navigate(['/auth/login']);
                }
            }));
    }

    logout(): Observable<any> {
        return this.http.post(`${this.API_URL}/logout`, {})
            .pipe(
                catchError(err => {
                    console.warn('[AuthService] Logout API failed (expected if session expired):', err);
                    return of({ success: true }); // Continue cleanup anyway
                }),
                finalize(() => {
                    this.clearAuth();
                    this.router.navigate(['/auth/login']);
                    // Reset orchestrator if it exists (via notification or direct reset)
                    // Note: We might need a logout event or direct call
                })
            );
    }

    // ═══════════════════════════════════════════════════════════════
    // USER DATA METHODS
    // ═══════════════════════════════════════════════════════════════

    getCurrentUser(): Observable<User> {
        return this.http.get<{ success: boolean; data: User }>(`${environment.apiUrl}/users/profile`)
            .pipe(
                map(response => response.data),
                tap(user => {
                    this.currentUser.set(user);
                    localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));
                })
            );
    }

    refreshUserData(): Observable<AuthResponse> {
        return this.http.get<AuthResponse>(`${environment.apiUrl}/users/profile`)
            .pipe(
                tap(response => {
                    if (response.success && response.user) {
                        const user = response.user;
                        localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));
                        this.currentUser.set(user);
                    }
                })
            );
    }

    completeOnboarding(data: { city: string; userType: string }): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/users/complete-onboarding`, data)
            .pipe(
                tap(response => {
                    if (response.success) {
                        const newToken = response.token ||
                            response.data?.token ||
                            response.data?.accessToken;

                        if (newToken) {
                            localStorage.setItem(environment.storageKeys.token, newToken);
                            this.isAuthenticated.set(true);
                        }

                        const userFromResponse = response.user || response.data?.user;
                        const current = this.currentUser();

                        if (userFromResponse || current) {
                            const updatedUser: User = {
                                ...(userFromResponse || current!),
                                onboardingComplete: true,
                                userType: data.userType,
                                role: userFromResponse?.role || current?.role || 'user'
                            };

                            localStorage.setItem(environment.storageKeys.user, JSON.stringify(updatedUser));
                            this.currentUser.set(updatedUser);
                        }

                        localStorage.setItem(environment.storageKeys.hasSeenOnboarding, 'true');
                    }
                })
            );
    }

    updateProfile(data: Partial<User>): Observable<AuthResponse> {
        return this.http.put<AuthResponse>(`${environment.apiUrl}/users/profile/update`, data)
            .pipe(
                tap(response => {
                    if (response.success && response.user) {
                        const user = response.user;
                        localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));
                        this.currentUser.set(user);
                    }
                })
            );
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS (Synchronous Getters)
    // ═══════════════════════════════════════════════════════════════

    getToken(): string | null {
        return localStorage.getItem(environment.storageKeys.token);
    }

    getUserValue(): User | null {
        return this.currentUser();
    }

    getUserFullName(): string {
        return this.userFullName();
    }

    getUserFirstName(): string {
        return this.userFirstName();
    }

    isUserAuthenticated(): boolean {
        return this.isAuthenticated();
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════

    private handleAuth(response: AuthResponse): void {
        if (!response.success) return;

        const token = response.token ||
            response.data?.token ||
            (response.data as any)?.accessToken;

        const user = response.user || response.data?.user;

        if (token && user) {
            localStorage.setItem(environment.storageKeys.token, token);
            localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));

            this.currentUser.set(user);
            this.isAuthenticated.set(true);

            const hasCompletedOnboarding = user.onboardingComplete === true ||
                localStorage.getItem(environment.storageKeys.hasSeenOnboarding) === 'true';

            const isAdmin = user.role === 'admin' || user.userType === 'admin' || (user as any).isAdmin === true;

            void this.handlePostLogin(hasCompletedOnboarding, isAdmin);
        }
    }

    private async handlePostLogin(hasCompletedOnboarding: boolean, isAdmin: boolean): Promise<void> {
        const activeTrip = await this.fetchActiveTrip();
        const nextRoute = getPostLoginRoute(hasCompletedOnboarding, isAdmin);

        if (activeTrip && shouldPromptActiveTripOnDashboard(hasCompletedOnboarding, isAdmin)) {
            await this.router.navigate([nextRoute]);
            setTimeout(() => {
                void this.promptForActiveTrip(activeTrip);
            }, 0);
            return;
        }

        if (!activeTrip) {
            await this.router.navigate([nextRoute]);
            return;
        }

        await this.router.navigate([nextRoute]);
    }

    private async promptForActiveTrip(activeTrip: any): Promise<void> {
        const tripId = activeTrip._id || activeTrip.id || activeTrip.tripId || activeTrip.trip_id || '';
        const choice = await this.activeTripPromptService.prompt({
            tripId,
            destination: this.getActiveTripDestination(activeTrip),
            startedAt: this.getActiveTripStartTime(activeTrip),
            status: activeTrip.status || activeTrip.tripStatus || 'active',
            raw: activeTrip
        });

        if (choice === 'resume') {
            await this.router.navigate(['/trip-tracking']);
            return;
        }

        if (choice === 'cancel') {
            await this.cancelActiveTrip(activeTrip);
        }
    }

    private async fetchActiveTrip(): Promise<any | null> {
        try {
            const response = await firstValueFrom(
                this.tripHttpService.getActiveTrip().pipe(
                    catchError(() => of({ success: false, data: null }))
                )
            );

            if (!response?.success || !response.data) {
                return null;
            }

            const trip = Array.isArray(response.data) ? response.data[0] : response.data;
            return trip || null;
        } catch {
            return null;
        }
    }

    private getActiveTripDestination(trip: any): string {
        if (!trip) {
            return 'Unknown destination';
        }

        if (trip.selectedRoute?.segments?.length) {
            const lastSegment = trip.selectedRoute.segments[trip.selectedRoute.segments.length - 1];
            return lastSegment?.toStop?.name || lastSegment?.to || 'Unknown destination';
        }

        if (trip.destination?.name) {
            return trip.destination.name;
        }

        if (trip.destinationLocation?.latitude && trip.destinationLocation?.longitude) {
            return `Lat ${trip.destinationLocation.latitude}, Lng ${trip.destinationLocation.longitude}`;
        }

        return 'Unknown destination';
    }

    private getActiveTripStartTime(trip: any): string | undefined {
        return trip.createdAt || trip.updatedAt || trip.startedAt || undefined;
    }

    private async cancelActiveTrip(trip: any): Promise<void> {
        const tripId = trip._id || trip.id || trip.tripId || trip.trip_id;
        if (!tripId) {
            return;
        }

        try {
            await firstValueFrom(this.tripHttpService.cancelTrip(tripId, 'Cancelled by user after login due to unfinished trip'));
        } catch (error) {
            console.warn('[AuthService] Failed to cancel active trip after login:', error);
        }
    }

    private clearAuth(): void {
        localStorage.removeItem(environment.storageKeys.token);
        localStorage.removeItem(environment.storageKeys.user);
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
    }
}