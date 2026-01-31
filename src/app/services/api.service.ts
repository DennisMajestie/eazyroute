import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AllUrlService } from './allUrl.service';

export interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        user?: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phoneNumber?: string;
            role: string;
            status: string;
            profilePicture?: string;
            onboardingComplete?: boolean;
        };
        accessToken?: string;
        refreshToken?: string;
        userId?: string;
    };
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    fullName: string;
    phone: string;
    password: string;
    confirmPassword: string;
}

export interface OnboardingRequest {
    city: string;
    userType: string;
}

export interface OnboardingResponse {
    success: boolean;
    message: string;
    data?: any;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: string;
    status: string;
    profilePicture?: string;
    onboardingComplete?: boolean;
}

// Add this method in the AUTH METHODS section (after resendOTP)
/**
 * Complete user onboarding
 */

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    private accessTokenSubject = new BehaviorSubject<string | null>(null);
    public accessToken$ = this.accessTokenSubject.asObservable();

    constructor(private http: HttpClient, private urls: AllUrlService) {
        this.initializeAuth();
    }

    /**
     * Initialize authentication from localStorage
     */
    private initializeAuth(): void {
        const token = localStorage.getItem('accessToken');
        const user = localStorage.getItem('user');

        if (token) {
            this.accessTokenSubject.next(token);
            this.isAuthenticatedSubject.next(true);
        }

        if (user) {
            try {
                this.currentUserSubject.next(JSON.parse(user));
            } catch (error) {
                console.error('Error parsing user from localStorage:', error);
            }
        }
    }

    /**
     * Get headers with authorization token
     */
    private getHeaders(): HttpHeaders {
        const token = this.accessTokenSubject.value;
        let headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }

        return headers;
    }

    /**
     * Save tokens and user to localStorage
     */
    private saveAuthData(response: AuthResponse): void {
        if (response.data?.accessToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
            this.accessTokenSubject.next(response.data.accessToken);
        }

        if (response.data?.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }

        if (response.data?.user) {
            const user: User = {
                id: response.data.user.id || '',
                email: response.data.user.email || '',
                firstName: response.data.user.firstName || '',
                lastName: response.data.user.lastName || '',
                phoneNumber: response.data.user.phoneNumber || '',
                role: response.data.user.role || 'user',
                status: response.data.user.status || 'active',
                profilePicture: response.data.user.profilePicture
            };
            localStorage.setItem('user', JSON.stringify(user));
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);
        }
    }

    /**
     * Clear authentication data
     */
    private clearAuthData(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        this.accessTokenSubject.next(null);
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
    }

    // ==================== GENERIC HTTP METHODS ====================

    /**
     * GET request
     */
    getData(url: string, params?: any): Observable<any> {
        return this.http.get(url, {
            params,
            headers: this.getHeaders()
        });
    }

    /**
     * POST request
     */
    postData(url: string, data: any): Observable<any> {
        return this.http.post(url, data, {
            headers: this.getHeaders()
        });
    }

    /**
     * PUT request
     */
    putData(url: string, data: any): Observable<any> {
        return this.http.put(url, data, {
            headers: this.getHeaders()
        });
    }

    /**
     * PATCH request
     */
    patchData(url: string, data: any): Observable<any> {
        return this.http.patch(url, data, {
            headers: this.getHeaders()
        });
    }

    /**
     * DELETE request
     */
    deleteData(url: string): Observable<any> {
        return this.http.delete(url, {
            headers: this.getHeaders()
        });
    }

    // ==================== AUTH METHODS ====================

    /**
     * Register new user
     */
    register(request: RegisterRequest): Observable<AuthResponse> {
        return this.postData(this.urls.allUrl.auth.register, request).pipe(
            tap((response: AuthResponse) => {
                if (response.success) {
                    this.saveAuthData(response);
                }
            })
        );
    }

    /**
     * Verify OTP
     */
    /**
    * Verify OTP
    */
    verifyOTP(request: any): Observable<AuthResponse> {
        console.log('🔧 API Service: verifyOTP called with:', request);
        console.log('🔧 API Service: URL:', this.urls.allUrl.auth.verifyOTP);

        return this.postData(this.urls.allUrl.auth.verifyOTP, request).pipe(
            tap({
                next: (response: AuthResponse) => {
                    console.log('🔧 API Service: Response received in tap:', response);
                    if (response && response.success) {
                        console.log('🔧 API Service: Saving auth data...');
                        this.saveAuthData(response);
                        console.log('🔧 API Service: Auth data saved');
                    } else {
                        console.warn('🔧 API Service: Response does not have success=true', response);
                    }
                },
                error: (error) => {
                    console.error('🔧 API Service: Error in tap operator:', error);
                }
            })
        );
    }


    /**
     * Login user
     */

    login(request: LoginRequest): Observable<AuthResponse> {
        return this.postData(this.urls.allUrl.auth.login, request).pipe(
            tap((response: AuthResponse) => {
                if (response.success) {
                    this.saveAuthData(response);
                }
            })
        );
    }

    /**
     * Logout user
     */
    logout(): Observable<any> {
        return this.postData(this.urls.allUrl.auth.logout, {}).pipe(
            tap(() => {
                this.clearAuthData();
            })
        );
    }

    /**
     * Refresh access token
     */
    refreshToken(refreshToken: string): Observable<AuthResponse> {
        return this.postData(this.urls.allUrl.auth.refreshToken, { refreshToken }).pipe(
            tap((response: AuthResponse) => {
                if (response.data.accessToken) {
                    localStorage.setItem('accessToken', response.data.accessToken);
                    this.accessTokenSubject.next(response.data.accessToken);
                }
            })
        );
    }

    /**
     * Forgot password
     */
    forgotPassword(email: string): Observable<any> {
        return this.postData(this.urls.allUrl.auth.forgotPassword, { email });
    }

    /**
     * Reset password
     */
    resetPassword(email: string, otp: string, newPassword: string): Observable<any> {
        return this.postData(this.urls.allUrl.auth.resetPassword, {
            email,
            otp,
            newPassword
        });
    }

    /**
     * Resend OTP
     */
    resendOTP(email: string): Observable<AuthResponse> {
        return this.postData(this.urls.allUrl.auth.resendOTP, { email });
    }

    /**
 * Complete user onboarding
 */
    completeOnboarding(request: OnboardingRequest): Observable<OnboardingResponse> {
        return this.postData(this.urls.allUrl.users.completeOnboarding, request).pipe(
            tap((response: OnboardingResponse) => {
                if (response.success) {
                    // Update current user's onboarding status
                    const currentUser = this.currentUserSubject.value;
                    if (currentUser) {
                        currentUser.onboardingComplete = true;
                        localStorage.setItem('user', JSON.stringify(currentUser));
                        this.currentUserSubject.next(currentUser);
                    }
                }
            })
        );
    }

    // ==================== ROUTES METHODS ====================

    createRoute(data: any): Observable<any> {
        return this.postData(this.urls.allUrl.routes.create, data);
    }

    searchRoutes(params?: any): Observable<any> {
        return this.getData(this.urls.allUrl.routes.search, params);
    }

    getRouteById(id: string): Observable<any> {
        return this.getData(this.urls.allUrl.routes.getOne + id);
    }

    updateRoute(id: string, data: any): Observable<any> {
        return this.putData(this.urls.allUrl.routes.update + id, data);
    }

    deleteRoute(id: string): Observable<any> {
        return this.deleteData(this.urls.allUrl.routes.delete + id);
    }

    // ==================== BUS STOPS METHODS ====================

    getBusStops(params?: any): Observable<any> {
        return this.getData(this.urls.allUrl.busStops.getAll, params);
    }

    createBusStop(data: any): Observable<any> {
        return this.postData(this.urls.allUrl.busStops.create, data);
    }

    getBusStopById(id: string): Observable<any> {
        return this.getData(this.urls.allUrl.busStops.getOne + id);
    }

    getBusStopsByCity(city: string): Observable<any> {
        return this.getData(this.urls.allUrl.busStops.getByCity + city);
    }

    searchNearbyBusStops(latitude?: number, longitude?: number, maxDistance?: number): Observable<any> {
        const params: any = {
            maxDistance: maxDistance || 10
        };

        if (latitude !== undefined) params.latitude = latitude;
        if (longitude !== undefined) params.longitude = longitude;

        return this.getData(this.urls.allUrl.busStops.searchNearby, params);
    }

    // ==================== TAG-ALONG RIDES METHODS ====================

    getTagAlongRides(params?: any): Observable<any> {
        return this.getData(this.urls.allUrl.tagAlongRides.getAll, params);
    }

    createTagAlongRide(data: any): Observable<any> {
        return this.postData(this.urls.allUrl.tagAlongRides.create, data);
    }

    getTagAlongRideById(id: string): Observable<any> {
        return this.getData(this.urls.allUrl.tagAlongRides.getOne + id);
    }

    joinTagAlongRide(id: string): Observable<any> {
        return this.postData(this.urls.allUrl.tagAlongRides.join + id + '/join', {});
    }

    leaveTagAlongRide(id: string): Observable<any> {
        return this.postData(this.urls.allUrl.tagAlongRides.leave + id + '/leave', {});
    }

    // ==================== UTILITY METHODS ====================

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    getAccessToken(): string | null {
        return this.accessTokenSubject.value;
    }

    isAuthenticated(): boolean {
        return this.isAuthenticatedSubject.value;
    }
}