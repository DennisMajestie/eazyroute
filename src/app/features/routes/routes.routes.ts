// src/app/features/routes/routes.routes.ts
import { Routes } from '@angular/router';


export const ROUTES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('../routes/route-finder/route-finder.component').then(m => m.RouteFinderComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('../routes/route-details/route-details.component').then(m => m.RouteDetailsComponent)
    },


];