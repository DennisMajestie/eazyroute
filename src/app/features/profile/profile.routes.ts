import { Routes } from '@angular/router';

// src/app/features/profile/profile.routes.ts
export const PROFILE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('../profile/profile-view/profile-view.component').then(m => m.ProfileViewComponent)
    },
    {
        path: 'edit',
        loadComponent: () => import('../profile/edit-profile/edit-profile.component').then(m => m.EditProfileComponent)
    },
    {
        path: 'settings',
        loadComponent: () => import('../profile/settings/settings.component').then(m => m.SettingsComponent)
    }
];