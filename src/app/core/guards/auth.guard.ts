// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Use the signal value directly or the helper method
    const isAuthenticated = authService.isAuthenticated();
    const token = authService.getToken();

            
    if (isAuthenticated) {
                return true;
    }

    // Attempt to recover session from storage if signal is false but token exists
    // This handles page reloads where signal resets but storage persists
    if (token) {
                return true;
    }

    // Not authenticated - redirect to login
        router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
    });
    return false;
};