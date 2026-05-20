// src/app/core/guards/onboarding.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const onboardingGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.getUserValue();
    const hasCompletedOnboarding = user?.onboardingComplete === true;

    // If user has already completed onboarding, redirect to dashboard
    if (hasCompletedOnboarding) {
        router.navigate(['/dashboard']);
        return false;
    }

    // Allow access to onboarding
    return true;
};