import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastNotificationService } from '../services/toast-notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const toastService = inject(ToastNotificationService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'An unexpected error occurred';
            let errorTitle = 'System Error';

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = error.error.message;
            } else {
                // Server-side error
                // Extract message from backend response if available
                errorMessage = error.error?.message || error.message || errorMessage;
                
                // Specific Handling for Conflict/Validation
                if (error.status === 400 || error.status === 409 || error.status === 412) {
                    errorTitle = 'Action Required';
                    if (errorMessage.toLowerCase().includes('already exists')) {
                        errorTitle = 'Already Exists';
                    }
                } else if (error.status === 500) {
                    errorTitle = 'Server Engine Failure';
                } else if (error.status === 0) {
                    errorTitle = 'Connection Error';
                    errorMessage = 'We cannot connect to the EazyRoute servers. Please check your internet.';
                }
            }

            // Show Premium Toast
            toastService.error(errorTitle, errorMessage, 8000, {
                vibrate: true
            });

            return throwError(() => error);
        })
    );
};