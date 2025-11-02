import { Routes } from '@angular/router';

// src/app/features/dashboard/dashboard.routes.ts
export const DASHBOARD_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('../dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
    }
];