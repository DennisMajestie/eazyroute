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
export const sanitizerInterceptor: HttpInterceptorFn = (req, next) => {
    // Only intercept routing and along requests
    const isRoutingRequest = req.url.includes('/routes') || req.url.includes('/along') || req.url.includes('/generate-route');

    return next(req).pipe(
        map(event => {
            if (event instanceof HttpResponse && isRoutingRequest) {
                const body = event.body as any;

                // If body has success/data structure
                if (body && body.success && body.data) {
                    return event.clone({
                        body: {
                            ...body,
                            data: DataSanitizer.sanitize(body.data, 'route')
                        }
                    });
                }
            }
            return event;
        })
    );
};
