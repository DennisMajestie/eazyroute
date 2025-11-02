// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
export const routes: Routes = [
    { path: '', redirectTo: '/auth/splash', pathMatch: 'full' },
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
    },
    {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
        canActivate: [authGuard]
    },
    {
        path: 'routes',
        loadChildren: () => import('./features/routes/routes.routes').then(m => m.ROUTES_ROUTES),
        canActivate: [authGuard]
    },
    {
        path: 'tag-along',
        loadChildren: () => import('./features/tag-along/tag-along.routes').then(m => m.TAG_ALONG_ROUTES),
        canActivate: [authGuard]
    },
    {
        path: 'bus-stops',
        loadChildren: () => import('./features/bus-stops/bus-stops.routes').then(m => m.BUS_STOPS_ROUTES),
        canActivate: [authGuard]
    },
    {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES),
        canActivate: [authGuard]
    },
    { path: '**', redirectTo: '/dashboard' }
];