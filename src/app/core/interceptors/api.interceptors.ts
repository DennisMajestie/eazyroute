/**
 * ═══════════════════════════════════════════════════════════════════
 * UPDATED HTTP INTERCEPTOR (Using Your Storage Keys)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/interceptors/api.interceptor.ts
 */

import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
    constructor() { }

    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        // ✅ Using your storage key for token
        const token = localStorage.getItem(environment.storageKeys.token);

        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        // Add common headers
        request = request.clone({
            setHeaders: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                console.error('[API Error]', error);

                // Handle specific error codes
                if (error.status === 401) {
                    console.error('Unauthorized access');
                    // Clear token
                    localStorage.removeItem(environment.storageKeys.token);
                    localStorage.removeItem(environment.storageKeys.user);
                    // Redirect to login
                    // this.router.navigate(['/auth/login']);
                } else if (error.status === 404) {
                    console.error('Resource not found:', error.url);
                } else if (error.status === 500) {
                    console.error('Server error');
                }

                return throwError(() => error);
            })
        );
    }
}
