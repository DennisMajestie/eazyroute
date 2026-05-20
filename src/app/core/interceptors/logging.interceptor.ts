// src/app/core/interceptors/logging.interceptor.ts
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
    const startTime = Date.now();

    
    return next(req).pipe(
        tap({
            next: (event) => {
                const duration = Date.now() - startTime;

                // Only log when we get the actual HttpResponse, not other events
                if (event instanceof HttpResponse) {
                                                                            }
            },
            error: (error) => {
                const duration = Date.now() - startTime;
                console.error(`❌ Error: ${req.method} ${req.url} - ${duration}ms`, error);
            }
        })
    );
};