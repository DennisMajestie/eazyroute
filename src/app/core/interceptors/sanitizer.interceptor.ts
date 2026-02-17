import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { DataSanitizer } from '../utils/data-sanitizer';

/**
 * ═══════════════════════════════════════════════════════════════════
 * SANITIZER INTERCEPTOR
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Automatically intercepts responses from volatile routing endpoints
 * and applies structural normalization via DataSanitizer.
 */

interface ApiResponse {
    success: boolean;
    data: any;
    message?: string;
}

export const sanitizerInterceptor: HttpInterceptorFn = (req, next) => {
    // Only intercept routing and along requests
    const isRoutingRequest = req.url.includes('/routes') ||
        req.url.includes('/along') ||
        req.url.includes('/generate-route') ||
        req.url.includes('/trips') ||
        req.url.includes('/rerouting');

    if (isRoutingRequest) {
        return next(req).pipe(
            map(event => {
                if (event instanceof HttpResponse) {
                    const body = event.body as ApiResponse | null;
                    if (body && body.success && body.data) {
                        let schema: 'route' | 'trip' | 'reroute' = 'route';
                        if (req.url.includes('/trips')) schema = 'trip';
                        if (req.url.includes('/rerouting')) schema = 'reroute';

                        console.log(`[SanitizerInterceptor] Identified schema: ${schema} for URL: ${req.url}`);
                        const sanitizedData = DataSanitizer.sanitize(body.data, schema);
                        console.log(`[SanitizerInterceptor] Sanitized data:`, sanitizedData);

                        return event.clone({
                            body: {
                                ...body,
                                data: sanitizedData
                            }
                        });
                    }
                }
                return event;
            })
        );
    } else {
        return next(req);
    }
};
