import { Routes } from '@angular/router';

export const TAG_ALONG_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('../tag-along/available-rides/available-rides.component').then(m => m.AvailableRidesComponent)
    },
    {
        path: 'create',
        loadComponent: () => import('../tag-along/create-rides/create-rides.component').then(m => m.CreateRidesComponent)
    },
    {
        path: 'my-rides',
        loadComponent: () => import('../tag-along/my-rides/my-rides.component').then(m => m.MyRidesComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('../tag-along/ride-details/ride-details.component').then(m => m.RideDetailsComponent)
    }
];