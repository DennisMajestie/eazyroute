import { Routes } from '@angular/router';

// src/app/features/bus-stops/bus-stops.routes.ts
export const BUS_STOPS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('../bus-stops/stop-list/stop-list.component').then(m => m.StopListComponent)
    },
    {
        path: 'add',
        loadComponent: () => import('../bus-stops/add-stop/add-stop.component').then(m => m.AddStopComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('../bus-stops/stop-details/stop-details.component').then(m => m.StopDetailsComponent)
    }
];