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

  // Step 1 — hub + project picker (replaces old welcome dashboard)
  {
    path: 'dashboard',
    loadComponent: () => import('./components/project-picker/project-picker').then(m => m.ProjectPicker),
    canActivate: [authGuard]
  },

  // Step 2 — the actual project dashboard with all panels
  {
    path: 'dashboard/:hubId/:projectId',
    loadComponent: () => import('./components/project-dashboard/project-dashboard').then(m => m.ProjectDashboard),
    canActivate: [authGuard]
  },

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