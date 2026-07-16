// src/app/components/admin-router/admin-router.ts
//
// Stub role router. Real role data doesn't exist yet — this is a manual
// toggle standing in for it. Replace the localStorage read/write with a
// real role lookup once the Auth service provides one.

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

type Role = 'dashboard' | 'viewer' | 'checqr';

const ROLE_STORAGE_KEY = 'apsUserRole';

@Component({
  standalone: true,
  selector: 'app-admin-router',
  imports: [CommonModule],
  templateUrl: './admin-router.html',
  styleUrl: './admin-router.css',
})
export class AdminRouter implements OnInit {
  selectedRole: Role | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY) as Role | null;
    if (stored === 'dashboard' || stored === 'viewer' || stored === 'checqr') {
      this.selectedRole = stored;
    }
  }

  onSelectRole(role: Role): void {
    if (role === 'checqr') return; // not deployed yet — stubbed out

    localStorage.setItem(ROLE_STORAGE_KEY, role);
    this.selectedRole = role;

    if (role === 'dashboard') {
      // this.router.navigate(['/dashboard']);
      this.router.navigate(['/dashboardlogin']);
    } else if (role === 'viewer') {
      this.router.navigate(['/browser']);
    }
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
