import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService, ActiveToast } from 'ngx-toastr';
import { LoadingStateService } from '../services/loading-state.service';
import { timer, throwError, retry, tap, catchError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const toastr = inject(ToastrService);
    const loadingState = inject(LoadingStateService);

    let wakeupToast: ActiveToast<any> | null = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 10000; // 10 seconds

    return next(req).pipe(
        retry({
            count: maxRetries,
            delay: (error: HttpErrorResponse, count) => {
                const isColdStart = error.status === 504 || error.status === 0;
                if (isColdStart) {
                    retryCount = count;
                    
                    // Show global loading state
                    loadingState.setInitialLoading(`Server is waking up (Attempt ${count}/${maxRetries})...`);
                    
                    // Show/Update toastr notification
                    if (!wakeupToast) {
                        wakeupToast = toastr.info(
                            'The server is waking up after a period of inactivity. Please wait...', 
                            'Cold Start Detected', 
                            { timeOut: 0, extendedTimeOut: 0, closeButton: false }
                        );
                    }
                    
                    return timer(retryDelay);
                }
                return throwError(() => error);
            }
        }),
        tap({
            next: () => {
                // If we successfully get a response after retries, clear the wakeup state
                if (retryCount > 0) {
                    loadingState.reset();
                    if (wakeupToast) {
                        toastr.clear(wakeupToast.toastId);
                        toastr.success('Server is ready!', 'Connection Restored');
                    }
                }
            }
        }),
        catchError((error: HttpErrorResponse) => {
            // Final error handler if all retries fail or for other error types
            
            // Clean up wakeup UI if it was active
            loadingState.reset();
            if (wakeupToast) {
                toastr.clear(wakeupToast.toastId);
            }

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
                } else if (error.status === 504 || error.status === 0) {
                    // Render free-tier cold start failed after all retries
                    loadingState.setHardFailure('api_timeout', 'The server is taking too long to respond. Please check your connection and try again.');
                    errorMessage = 'Server wake-up timed out. Please refresh the page or try again in a moment.';
                }
            }

            toastr.error(errorMessage);
            return throwError(() => error);
        })
    );
};