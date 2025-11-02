// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const toastr = inject(ToastrService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'An error occurred';

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = `Error: ${error.error.message}`;
            } else {
                // Server-side error
                errorMessage = error.error?.message || `Error Code: ${error.status}`;

                if (error.status === 401) {
                    router.navigate(['/auth/login']);
                    errorMessage = 'Session expired. Please login again.';
                } else if (error.status === 403) {
                    errorMessage = 'You do not have permission to access this resource.';
                } else if (error.status === 404) {
                    errorMessage = 'Resource not found.';
                } else if (error.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
            }

            toastr.error(errorMessage);
            return throwError(() => error);
        })
    );
};