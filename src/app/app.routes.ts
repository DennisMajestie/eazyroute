// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
    // Redirect root to splash
    { path: '', redirectTo: '/auth/splash', pathMatch: 'full' },

    // Auth routes (no layout - no navbar)
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
    },

    // Event Landing Route (Public, no auth needed for guests)
    {
        path: 'events/invite/:code',
        loadComponent: () => import('./features/events/event-landing/event-landing.component').then(m => m.EventLandingComponent)
    },

    // Vendor Dashboard Route - Protected
    {
        path: 'events/dashboard',
        loadComponent: () => import('./features/events/vendor-dashboard/vendor-dashboard.component').then(m => m.VendorDashboardComponent),
        canActivate: [authGuard]
    },

    // Onboarding route (protected but without layout)
    {
        path: 'onboarding',
        loadComponent: () => import('./features/auth/onboarding/onboarding.component').then(m => m.OnboardingComponent),
        canActivate: [authGuard, onboardingGuard]
    },

    // Protected routes with layout (navbar + bottom nav)
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'home',
                loadComponent: () => import('./features/home/home-along/home-along.component').then(m => m.HomeAlongComponent)
            },
            {
                path: 'boarding-inference',
                loadComponent: () => import('./features/boarding/boarding-inference/boarding-inference.component').then(m => m.BoardingInferenceComponent)
            },
            {
                path: 'route-display',
                loadComponent: () => import('./features/route/route-display/route-display.component').then(m => m.RouteDisplayComponent)
            },
            {
                path: 'dashboard',
                loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
            },
            {
                path: 'routes',
                loadChildren: () => import('./features/routes/routes.routes').then(m => m.ROUTES_ROUTES)
            },
            {
                path: 'tag-along',
                loadChildren: () => import('./features/tag-along/tag-along.routes').then(m => m.TAG_ALONG_ROUTES)
            },
            {
                path: 'bus-stops',
                loadChildren: () => import('./features/bus-stops/bus-stops.routes').then(m => m.BUS_STOPS_ROUTES)
            },
            {
                path: 'trip-planner',
                loadComponent: () => import('./features/trip-planner/trip-planner/trip-planner.component').then(m => m.TripPlannerComponent)
            },
            {
                path: 'profile',
                loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES)
            }
        ]
    },

    // Fallback - redirect to auth splash instead of dashboard
    { path: '**', redirectTo: '/auth/splash' }
];