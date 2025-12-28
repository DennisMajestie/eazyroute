import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard to restrict access to administrator-only pages
 */
export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAdmin()) {
        return true;
    }

    // Redirect to dashboard if not an admin
    console.warn('[AdminGuard] Unauthorized access attempt to:', state.url);
    router.navigate(['/dashboard']);
    return false;
};
