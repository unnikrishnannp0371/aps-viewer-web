// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },

  // Post-login landing. Role-based routing stub — real roles come later.
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-router/admin-router').then(m => m.AdminRouter),
    canActivate: [authGuard]
  },

  // Dashboard flow (project-picker, project-dashboard, and the domain
  // panels) moved to aps-dashboards-web. admin-router's 'dashboard' role
  // button still navigates to '/dashboard' — that's intentional, it's
  // handled outside this app now.

  {
    path: 'browser',
    loadComponent: () => import('./components/browser/browser').then(m => m.Browser),
    canActivate: [authGuard]
  },
  {
    path: 'view/auth/:urn',
    loadComponent: () => import('./components/viewer/viewer').then(m => m.Viewer),
    canActivate: [authGuard]
  },
  {
    path: 'view/:token',
    loadComponent: () => import('./components/viewer/viewer').then(m => m.Viewer)
  },
  {
    path: '',
    redirectTo: 'admin',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];