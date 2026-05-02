import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { authGuard } from './guards/auth-guard';
import { Browser } from './components/browser/browser';


export const routes: Routes = [
    {
        path: 'login',
        component: Login
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [authGuard]
    },
    {
        path: 'browser',
        loadComponent: () => import('./components/browser/browser').then(m => m.Browser),
        canActivate: [authGuard]
    },
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
