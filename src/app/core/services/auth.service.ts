/**
 * ═══════════════════════════════════════════════════════════════════
 * AUTH SERVICE - Complete Authentication Service
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/services/auth.service.ts
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, BehaviorSubject } from 'rxjs';
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

    // ✅ Using Angular signals for reactive state management
    currentUser = signal<User | null>(null);
    isAuthenticated = signal<boolean>(false);

    // ✅ Computed signal for admin check
    isAdmin = computed(() => {
        const user = this.currentUser();
        return user?.role === 'admin' || (user as any)?.isAdmin === true;
    });

    // ✅ BehaviorSubject observables for compatibility with existing code
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    constructor(
        private http: HttpClient,
        private router: Router
    ) {
        this.loadUserFromStorage();
    }

    /**
     * ✅ Load user from localStorage on app startup
     */
    private loadUserFromStorage(): void {
        const token = localStorage.getItem(environment.storageKeys.token);
        const userJson = localStorage.getItem(environment.storageKeys.user);

        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);

                // Update both signals and BehaviorSubjects
                this.currentUser.set(user);
                this.isAuthenticated.set(true);
                this.currentUserSubject.next(user);
                this.isAuthenticatedSubject.next(true);

                console.log('[Auth] User loaded from storage:', user.firstName);
            } catch (error) {
                console.error('[Auth] Error parsing stored user:', error);
                this.clearAuth();
            }
        }
    }

    /**
     * ✅ Register new user
     */
    register(data: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/register`, data)
            .pipe(
                tap(response => {
                    console.log('=== REGISTER RESPONSE ===', response);

                    if (response.success) {
                        console.log('Registration successful, navigating to OTP...');
                        // Always redirect to OTP verification after registration
                        this.router.navigate(['/auth/verify-otp'], {
                            state: { email: data.email }
                        });
                    }
                })
            );
    }

    /**
     * ✅ Verify OTP
     */
    verifyOTP(data: OTPVerifyRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/verify-otp`, data)
            .pipe(tap(response => this.handleAuth(response)));
    }

    /**
     * ✅ Login
     */
    login(credentials: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)
            .pipe(tap(response => this.handleAuth(response)));
    }

    /**
     * ✅ Forgot Password
     */
    forgotPassword(data: PasswordResetRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/forgot-password`, data);
    }

    /**
     * ✅ Reset Password
     */
    resetPassword(data: PasswordResetConfirm): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/reset-password`, data)
            .pipe(tap(response => {
                if (response.success) {
                    this.router.navigate(['/auth/login']);
                }
            }));
    }

    /**
     * ✅ Logout
     */
    logout(): Observable<any> {
        return this.http.post(`${this.API_URL}/logout`, {})
            .pipe(
                tap(() => {
                    this.clearAuth();
                    // Navigation is handled by component or guard usually, but good fallback
                    this.router.navigate(['/auth/login']);
                })
            );

        // For now, clear locally and return observable
        this.clearAuth();
        this.router.navigate(['/auth/login']);
        return of(true);
    }

    /**
     * ✅ Get current user profile from server
     */
    getCurrentUser(): Observable<User> {
        return this.http.get<{ success: boolean; data: User }>(`${environment.apiUrl}/users/profile`)
            .pipe(
                map(response => response.data),
                tap(user => {
                    this.currentUser.set(user);
                    this.currentUserSubject.next(user);
                    localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));
                })
            );
    }

    /**
     * ✅ Refresh user data
     */
    refreshUserData(): Observable<AuthResponse> {
        return this.http.get<AuthResponse>(`${environment.apiUrl}/users/profile`)
            .pipe(
                tap(response => {
                    if (response.success && response.user) {
                        const user = response.user;
                        localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));
                        this.currentUser.set(user);
                        this.currentUserSubject.next(user);
                    }
                })
            );
    }

    /**
     * ✅ Update user profile
     */
    updateProfile(data: Partial<User>): Observable<AuthResponse> {
        return this.http.put<AuthResponse>(`${environment.apiUrl}/users/profile/update`, data)
            .pipe(
                tap(response => {
                    if (response.success && response.user) {
                        const user = response.user;
                        localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));
                        this.currentUser.set(user);
                        this.currentUserSubject.next(user);
                    }
                })
            );
    }

    /**
     * ✅ Handle authentication response
     */
    private handleAuth(response: AuthResponse): void {
        console.log('🔐 === HANDLE AUTH DEBUG ===');
        console.log('Full response:', response);

        if (!response.success) {
            console.warn('❌ Response not successful');
            return;
        }

        // Handle different token field names (token, accessToken)
        const token = response.token ||
            response.data?.token ||
            (response.data as any)?.accessToken;

        const user = response.user || response.data?.user;

        console.log('🔑 Extracted token:', token ? token.substring(0, 20) + '...' : 'MISSING');
        console.log('👤 Extracted user:', user);

        if (token && user) {
            console.log('💾 Saving to localStorage');

            localStorage.setItem(environment.storageKeys.token, token);
            localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));

            // Update both signals and BehaviorSubjects
            this.currentUser.set(user);
            this.isAuthenticated.set(true);
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);

            // Navigate based on onboarding status
            const hasCompletedOnboarding = user.onboardingComplete === true;
            console.log('🎯 Onboarding status:', hasCompletedOnboarding);

            if (hasCompletedOnboarding) {
                console.log('→ Navigating to dashboard');
                this.router.navigate(['/dashboard']);
            } else {
                console.log('→ Navigating to onboarding');
                this.router.navigate(['/onboarding']);
            }
        } else {
            console.error('❌ Missing token or user!');
        }
    }

    /**
     * ✅ Clear authentication
     */
    private clearAuth(): void {
        localStorage.removeItem(environment.storageKeys.token);
        localStorage.removeItem(environment.storageKeys.user);

        // Clear both signals and BehaviorSubjects
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
    }

    /**
     * ✅ Get token (synchronous)
     */
    getToken(): string | null {
        return localStorage.getItem(environment.storageKeys.token);
    }

    /**
     * ✅ Get user value (synchronous) - using signal
     */
    getUserValue(): User | null {
        return this.currentUser();
    }

    /**
     * ✅ Get user's full name
     */
    getUserFullName(): string {
        const user = this.currentUser();
        if (!user) return 'Guest';
        return `${user.firstName} ${user.lastName}`.trim() || 'User';
    }

    /**
     * ✅ Get user's first name
     */
    getUserFirstName(): string {
        const user = this.currentUser();
        return user?.firstName || 'Guest';
    }

    /**
     * ✅ Check if user is authenticated (synchronous)
     */
    isUserAuthenticated(): boolean {
        return this.isAuthenticated();
    }
}