import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment'; // ✅ FIX: Add this import

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private router: Router) { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        // Get token from localStorage
        const token = localStorage.getItem('auth_token');

        // Clone request and add token if it's an internal API call
        const isInternalApi = request.url.startsWith(environment.apiUrl);

        if (token && isInternalApi) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401 && isInternalApi) {
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem('auth_token');
                    this.router.navigate(['/login']);
                }
                return throwError(() => error);
            })
        );
    }
}