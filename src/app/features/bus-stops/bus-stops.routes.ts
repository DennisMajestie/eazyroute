import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';

// src/app/features/bus-stops/bus-stops.routes.ts
export const BUS_STOPS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('../bus-stops/stop-list/stop-list.component').then(m => m.StopListComponent)
    },
    {
        path: 'add',
        loadComponent: () => import('../bus-stops/add-place/add-place.component').then(m => m.AddPlaceComponent)
    },
    {
        path: 'verify-portal',
        loadComponent: () => import('../bus-stops/verification-portal/verification-portal.component').then(m => m.VerificationPortalComponent),
        canActivate: [adminGuard]
    },
    {
        path: ':id',
        loadComponent: () => import('../bus-stops/stop-details/stop-details.component').then(m => m.StopDetailsComponent)
    }
];