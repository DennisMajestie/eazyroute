// src/app/core/interceptors/logging.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
    const startTime = Date.now();

    console.log(`🚀 Request: ${req.method} ${req.url}`);

    return next(req).pipe(
        tap({
            next: (event) => {
                const duration = Date.now() - startTime;
                console.log(`✅ Response: ${req.method} ${req.url} - ${duration}ms`);
            },
            error: (error) => {
                const duration = Date.now() - startTime;
                console.error(`❌ Error: ${req.method} ${req.url} - ${duration}ms`, error);
            }
        })
    );
};
