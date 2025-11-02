// import { Injectable, signal } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, tap } from 'rxjs';
// import { Router } from '@angular/router';
// import { environment } from '../../../environments/environment';
// import { 
//   User, 
//   AuthResponse, 
//   LoginRequest, 
//   RegisterRequest,
//   OTPVerifyRequest,
//   PasswordResetRequest,
//   PasswordResetConfirm
// } from '../../models/user.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   // Using Angular signals for reactive state management
//   currentUser = signal<User | null>(null);
//   isAuthenticated = signal<boolean>(false);

//   private apiUrl = `${environment.apiUrl}/auth`;

//   constructor(
//     private http: HttpClient, 
//     private router: Router
//   ) {
//     this.loadUser();
//   }

//   private loadUser(): void {
//     const token = this.getToken();
//     const userStr = localStorage.getItem(environment.userKey);

//     if (token && userStr) {
//       try {
//         const user = JSON.parse(userStr);
//         this.currentUser.set(user);
//         this.isAuthenticated.set(true);
//       } catch (error) {
//         console.error('Error loading user from storage:', error);
//         this.clearAuth();
//       }
//     }
//   }

//   register(data: RegisterRequest): Observable<AuthResponse> {
//     return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data)
//       .pipe(
//         tap(response => {
//           if (response.success) {
//             if (response.requiresOtp) {
//               // Navigate to OTP verification
//               this.router.navigate(['/auth/otp-verify'], { 
//                 state: { email: data.email } 
//               });
//             } else {
//               // Direct login (if OTP not required)
//               this.handleAuth(response);
//             }
//           }
//         })
//       );
//   }

//   verifyOTP(data: OTPVerifyRequest): Observable<AuthResponse> {
//     return this.http.post<AuthResponse>(`${this.apiUrl}/verify-otp`, data)
//       .pipe(tap(response => this.handleAuth(response)));
//   }

//   login(credentials: LoginRequest): Observable<AuthResponse> {
//     return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
//       .pipe(tap(response => this.handleAuth(response)));
//   }

//   forgotPassword(data: PasswordResetRequest): Observable<AuthResponse> {
//     return this.http.post<AuthResponse>(`${this.apiUrl}/forgot-password`, data);
//   }

//   resetPassword(data: PasswordResetConfirm): Observable<AuthResponse> {
//     return this.http.post<AuthResponse>(`${this.apiUrl}/reset-password`, data)
//       .pipe(tap(response => {
//         if (response.success) {
//           this.router.navigate(['/auth/login']);
//         }
//       }));
//   }

//   logout(): void {
//     this.clearAuth();
//     this.router.navigate(['/auth/login']);
//   }

//   refreshUserData(): Observable<AuthResponse> {
//     return this.http.get<AuthResponse>(`${environment.apiUrl}/users/profile`)
//       .pipe(
//         tap(response => {
//           if (response.success && response.user) {
//             localStorage.setItem(environment.userKey, JSON.stringify(response.user));
//             this.currentUser.set(response.user);
//           }
//         })
//       );
//   }

//   updateProfile(data: Partial<User>): Observable<AuthResponse> {
//     return this.http.put<AuthResponse>(`${environment.apiUrl}/users/profile`, data)
//       .pipe(
//         tap(response => {
//           if (response.success && response.user) {
//             localStorage.setItem(environment.userKey, JSON.stringify(response.user));
//             this.currentUser.set(response.user);
//           }
//         })
//       );
//   }

//   private handleAuth(response: AuthResponse): void {
//     if (!response.success) {
//       return;
//     }

//     // Handle both response structures
//     const token = response.token || response.data?.token;
//     const user = response.user || response.data?.user;

//     if (token && user) {
//       localStorage.setItem(environment.tokenKey, token);
//       localStorage.setItem(environment.userKey, JSON.stringify(user));
//       this.currentUser.set(user);
//       this.isAuthenticated.set(true);

//       // Navigate to dashboard
//       this.router.navigate(['/dashboard']);
//     }
//   }

//   private clearAuth(): void {
//     localStorage.removeItem(environment.tokenKey);
//     localStorage.removeItem(environment.userKey);
//     this.currentUser.set(null);
//     this.isAuthenticated.set(false);
//   }

//   getToken(): string | null {
//     return localStorage.getItem(environment.tokenKey);
//   }

//   getCurrentUser(): User | null {
//     return this.currentUser();
//   }

//   isUserAuthenticated(): boolean {
//     return this.isAuthenticated();
//   }
// }


import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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
    // Using Angular signals for reactive state management
    currentUser = signal<User | null>(null);
    isAuthenticated = signal<boolean>(false);

    private apiUrl = `${environment.apiUrl}/auth`;

    constructor(
        private http: HttpClient,
        private router: Router
    ) {
        this.loadUser();
    }

    private loadUser(): void {
        const token = this.getToken();
        const userStr = localStorage.getItem(environment.storageKeys.user);

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                this.currentUser.set(user);
                this.isAuthenticated.set(true);
            } catch (error) {
                console.error('Error loading user from storage:', error);
                this.clearAuth();
            }
        }
    }

    register(data: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data)
            .pipe(
                tap(response => {
                    if (response.success) {
                        if (response.requiresOtp) {
                            // Navigate to OTP verification
                            this.router.navigate(['/auth/otp-verify'], {
                                state: { email: data.email }
                            });
                        } else {
                            // Direct login (if OTP not required)
                            this.handleAuth(response);
                        }
                    }
                })
            );
    }

    verifyOTP(data: OTPVerifyRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/verify-otp`, data)
            .pipe(tap(response => this.handleAuth(response)));
    }

    login(credentials: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
            .pipe(tap(response => this.handleAuth(response)));
    }

    forgotPassword(data: PasswordResetRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/forgot-password`, data);
    }

    resetPassword(data: PasswordResetConfirm): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/reset-password`, data)
            .pipe(tap(response => {
                if (response.success) {
                    this.router.navigate(['/auth/login']);
                }
            }));
    }

    logout(): void {
        this.clearAuth();
        this.router.navigate(['/auth/login']);
    }

    refreshUserData(): Observable<AuthResponse> {
        return this.http.get<AuthResponse>(`${environment.apiUrl}/users/profile`)
            .pipe(
                tap(response => {
                    if (response.success && response.user) {
                        localStorage.setItem(environment.storageKeys.user, JSON.stringify(response.user));
                        this.currentUser.set(response.user);
                    }
                })
            );
    }

    updateProfile(data: Partial<User>): Observable<AuthResponse> {
        return this.http.put<AuthResponse>(`${environment.apiUrl}/users/profile`, data)
            .pipe(
                tap(response => {
                    if (response.success && response.user) {
                        localStorage.setItem(environment.storageKeys.user, JSON.stringify(response.user));
                        this.currentUser.set(response.user);
                    }
                })
            );
    }

    private handleAuth(response: AuthResponse): void {
        if (!response.success) {
            return;
        }

        // Handle both response structures
        const token = response.token || response.data?.token;
        const user = response.user || response.data?.user;

        if (token && user) {
            localStorage.setItem(environment.storageKeys.token, token);
            localStorage.setItem(environment.storageKeys.user, JSON.stringify(user));
            this.currentUser.set(user);
            this.isAuthenticated.set(true);

            // Navigate to dashboard
            this.router.navigate(['/dashboard']);
        }
    }

    private clearAuth(): void {
        localStorage.removeItem(environment.storageKeys.token);
        localStorage.removeItem(environment.storageKeys.user);
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
    }

    getToken(): string | null {
        return localStorage.getItem(environment.storageKeys.token);
    }

    getCurrentUser(): User | null {
        return this.currentUser();
    }

    isUserAuthenticated(): boolean {
        return this.isAuthenticated();
    }
}