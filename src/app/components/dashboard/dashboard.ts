import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth';
import { IssuesPanel, IssueViewerEvent } from '../issues-panel/issues-panel';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  // imports: [IssuesPanel],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  user: User | null = null;
  isLoggingOut = false;
  // Hub ID — from /api/v1/hubs response, the "id" field
  selectedHubId: string | null = null;

  // Project ID — from /api/v1/hubs/:hub_id/projects response, the "project_id" field  
  selectedProjectId: string | null = null;
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
  onIssueSelected(event: IssueViewerEvent): void {
    // This is the viewer integration hook.
    // In Step 6 (Clash panel) we'll flesh this out with the full Viewer API.
    // For now, log it so you can verify the data shape is correct.
    console.log('Fly to issue:', event.issue.title);
    console.log('Pushpin location:', event.issue.pushpin?.location);
    console.log('Viewable ID:', event.viewableId);
    // TODO Step 6: viewerService.flyTo(event.issue.pushpin, event.viewableId)
  }
}
