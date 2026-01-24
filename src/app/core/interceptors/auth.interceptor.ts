
// // src/app/core/interceptors/auth.interceptor.ts
// // import { HttpInterceptorFn } from '@angular/common/http';
// // import { inject } from '@angular/core';
// // import { AuthService } from '../services/auth.service';

// // export const authInterceptor: HttpInterceptorFn = (req, next) => {
// //     const authService = inject(AuthService);
// //     const token = authService.getToken();

// //     if (token) {
// //         req = req.clone({
// //             setHeaders: { Authorization: `Bearer ${token}` }  // ✅ Fixed: Added backticks
// //         });
// //     }

// //     return next(req);
// // };

// // src/app/core/interceptors/auth.interceptor.ts
// import { HttpInterceptorFn } from '@angular/common/http';
// import { inject } from '@angular/core';
// import { StorageService } from '../services/storage.service';

// /**
//  * HTTP Interceptor to add authentication token to requests
//  */
// export const authInterceptor: HttpInterceptorFn = (req, next) => {
//   const storageService = inject(StorageService);
//   const token = storageService.getAccessToken();

//   // Skip adding token for auth endpoints
//   const skipAuth = req.url.includes('/auth/login') || 
//                    req.url.includes('/auth/register') ||
//                    req.url.includes('/auth/verify-otp') ||
//                    req.url.includes('/auth/forgot-password') ||
//                    req.url.includes('/auth/reset-password') ||
//                    req.url.includes('/auth/refresh-token');

//   // Clone request and add authorization header if token exists
//   if (token && !skipAuth) {
//     req = req.clone({
//       setHeaders: {
//         Authorization: `Bearer ${token}`
//       }
//     });
//   }

//   // Add Content-Type for all requests if not already set
//   if (!req.headers.has('Content-Type') && !(req.body instanceof FormData)) {
//     req = req.clone({
//       setHeaders: {
//         'Content-Type': 'application/json'
//       }
//     });
//   }

//   return next(req);
// };

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.getToken();

    // Skip auth header for auth endpoints
    if (req.url.includes('/auth/login') ||
        req.url.includes('/auth/register') ||
        req.url.includes('/auth/verify-otp')) {
        return next(req);
    }

    // Only add auth header to our internal API requests
    const isInternalApi = req.url.startsWith(environment.apiUrl);

    if (token && isInternalApi) {
        const cloned = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        return next(cloned);
    }

    return next(req);
};