// src/app/features/auth/auth.routes.ts
import { Routes } from '@angular/router';
export const AUTH_ROUTES: Routes = [
    {
        path: 'splash',
        loadComponent: () => import('../auth/splash/splash.component').then(m => m.SplashComponent)
    },
    {
        path: 'onboarding',
        loadComponent: () => import('../auth/onboarding/onboarding.component').then(m => m.OnboardingComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('../auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('../auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: 'verify-otp',
        loadComponent: () => import('../auth/otp-verify/otp-verify.component').then(m => m.OtpVerifyComponent)
    },
    { path: '', redirectTo: 'splash', pathMatch: 'full' }
];