// src/app/core/guards/onboarding.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const onboardingGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.getUserValue();
    const hasCompletedOnboarding = user?.onboardingComplete === true;

    console.log('Onboarding Guard - User:', user?.firstName);
    console.log('Onboarding Guard - Completed:', hasCompletedOnboarding);

    // If user has already completed onboarding, redirect to dashboard
    if (hasCompletedOnboarding) {
        console.log('Onboarding Guard - Already completed, redirecting to dashboard');
        router.navigate(['/dashboard']);
        return false;
    }

    // Allow access to onboarding
    console.log('✅ Onboarding Guard - Access granted');
    return true;
};