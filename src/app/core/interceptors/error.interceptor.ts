import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastNotificationService } from '../services/toast-notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const toastService = inject(ToastNotificationService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'Something went wrong. Please try again.';
            let errorTitle = 'System Error';
            let shouldShowToast = false;

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = error.error.message;
                shouldShowToast = true;
            } else {
                // Server-side error
                // Extract message from backend response if available, guarding against technical Http failure messages
                const rawMessage = error.error?.message || error.message;
                errorMessage = (rawMessage && !rawMessage.includes('Http failure')) ? rawMessage : 'Something went wrong. Please try again.';
                
                // Specific Handling for global connection and server issues
                if (error.status === 500) {
                    errorTitle = 'Temporary Server Issue';
                    errorMessage = 'Our servers are experiencing a temporary issue. Please try again in a moment.';
                    shouldShowToast = true;
                } else if (error.status === 0) {
                    errorTitle = 'Connection Error';
                    errorMessage = 'We couldn\'t connect to our servers. Please check your internet connection.';
                    shouldShowToast = true;
                } else if (error.status >= 500) {
                    errorTitle = 'Server Error';
                    shouldShowToast = true;
                }
            }

            // Show Premium Toast only for global system/connection failures. 
            // Local client errors (e.g. 400, 401, 403, 409) are handled inline by components.
            if (shouldShowToast) {
                toastService.error(errorTitle, errorMessage, 8000, {
                    vibrate: true
                });
            }

            return throwError(() => error);
        })
    );
};