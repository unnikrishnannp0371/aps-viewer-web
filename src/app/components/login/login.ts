import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  isLoading = false;
  showUnauthorizedBanner = false;
  unauthorizedPageName = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const redirectUrl = sessionStorage.getItem('redirectUrl');

    if (redirectUrl) {
      this.showUnauthorizedBanner = true;
      this.unauthorizedPageName = this.getPageName(redirectUrl);

      setTimeout(() => {
        this.showUnauthorizedBanner = false;
        this.cdr.detectChanges();
      }, 4000);
    }

    this.authService.checkStatus().subscribe({
      next: (status) => {
        if (status.authenticated) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {}
    });
  }

  private getPageName(url: string): string {
    const segment = url.replace('/', '').replace(/-/g, ' ');
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  onLogin(): void {
    this.isLoading = true;
    this.authService.login();
  }
}