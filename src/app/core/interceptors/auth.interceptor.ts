import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router); // Functional way to inject dependencies
    const token = localStorage.getItem(environment.storageKeys.token);
    const isInternalApi = req.url.startsWith(environment.apiUrl);

    // List of endpoints that should NOT receive the Authorization header
    const publicEndpoints = [
        '/auth/login',
        '/auth/register',
        '/auth/verify-otp',
        '/auth/resend-otp',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/social'
    ];

    const isPublicEndpoint = publicEndpoints.some(path => req.url.includes(path));

    if (token && isInternalApi && !isPublicEndpoint) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Only auto-logout on 401 for auth-critical endpoints
            if (error.status === 401 && isInternalApi) {
                const criticalAuthPaths = [
                    '/api/v1/auth/verify',
                    '/api/v1/auth/refresh',
                    '/api/v1/auth/login',
                    '/api/v1/user/profile',
                    '/api/v1/users/profile',
                    '/api/v1/trips',
                    '/api/v1/rerouting'
                ];

                const isAuthCritical = criticalAuthPaths.some(path => req.url.includes(path));

                if (isAuthCritical) {
                    console.warn('[AuthInterceptor] Critical auth failure - logging out', req.url);
                    localStorage.removeItem(environment.storageKeys.token);
                    router.navigate(['/login']);
                } else {
                    console.log('[AuthInterceptor] 401 on optional endpoint (OK):', req.url);
                }
            }
            return throwError(() => error);
        })
    );
};