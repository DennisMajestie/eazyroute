/**
 * Auth Service - Signal-based State Management
 * Refactored to use Angular Signals exclusively (no BehaviorSubjects)
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
    User,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    OTPVerifyRequest,
    PasswordResetRequest,
    PasswordResetConfirm
} from '../../models/user.model';

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
        return user?.role === 'admin' ||
            user?.userType === 'admin' ||
            (user as any)?.isAdmin === true;
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
        private router: Router
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
                console.log('[Auth] User loaded from storage:', user.firstName);
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
                        this.router.navigate(['/auth/verify-otp'], {
                            state: { email: data.email }
                        });
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
                tap(() => {
                    this.clearAuth();
                    this.router.navigate(['/auth/login']);
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
                                role: data.userType === 'admin' ? 'admin' : (userFromResponse?.role || current?.role || 'user')
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

            if (hasCompletedOnboarding || isAdmin) {
                this.router.navigate(['/dashboard']);
            } else {
                this.router.navigate(['/onboarding']);
            }
        }
    }

    private clearAuth(): void {
        localStorage.removeItem(environment.storageKeys.token);
        localStorage.removeItem(environment.storageKeys.user);
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
    }
}