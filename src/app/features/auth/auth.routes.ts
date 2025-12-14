// src/app/features/auth/auth.routes.ts
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
    {
        path: 'splash',
        loadComponent: () => import('../auth/splash/splash.component').then(m => m.SplashComponent)
    },
    // REMOVE the onboarding route from here - it's now at root level
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
    {
        path: 'forgot-password',
        loadComponent: () => import('../auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
    },
    { path: '', redirectTo: 'splash', pathMatch: 'full' }
];