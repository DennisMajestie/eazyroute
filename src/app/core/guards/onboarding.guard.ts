// src/app/core/guards/onboarding.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ApiService } from '../../services/api.service';

export const onboardingGuard: CanActivateFn = (route, state) => {
    const apiService = inject(ApiService);
    const router = inject(Router);

    const user = apiService.getCurrentUser();
    const hasCompletedOnboarding = user?.onboardingComplete === true;

    console.log('Onboarding Guard - User:', user);
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