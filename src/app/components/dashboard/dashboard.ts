import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  user: User | null = null;
  isLoggingOut = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.checkStatus().subscribe({
      next: (status) => {
        if (status.authenticated && status.user) {
          this.user = status.user;
          this.cdr.detectChanges();
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        console.error('Auth error:', err);
      }
    });
  }

  onLogout(): void {
    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: () => {
        sessionStorage.removeItem('redirectUrl');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.isLoggingOut = false;
      }
    });
  }

  onBrowseFiles(): void {
    this.router.navigate(['/browser'])
  }
}
