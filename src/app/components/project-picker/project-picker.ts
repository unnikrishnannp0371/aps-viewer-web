import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BrowserService, Hub, Project } from '../../services/browser';
import { AuthService, User } from '../../services/auth';
import { Router } from '@angular/router';

type PickerStep = 'hub' | 'project';

@Component({
  standalone: true,
  selector: 'app-project-picker',
  imports: [CommonModule],
  templateUrl: './project-picker.html',
  styleUrl: './project-picker.css',
})

export class ProjectPicker implements OnInit{
  step: PickerStep = 'hub';
  hubs: Hub[]=[];
  projects: Project[] = [];

  selectedHub: Hub | null = null;
  isLoading = false;

  error: string | null = null;

  user: User | null = null;

  constructor(
    private browserService: BrowserService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.checkStatus().subscribe({
      next: (status) =>{
        if (status.user) this.user = status.user;
        this.cdr.detectChanges();
      },
      error: (error) => {}
    });
    this.loadHubs();
  }

  loadHubs(): void {
    this.isLoading = true;
    this.error = null;

    this.browserService.getHubs().subscribe({
      next: hubs => {
        this.hubs = hubs;
        this.step = 'hub';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.error = 'Failed to load hubs. Please try again';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    })
  }

  loadProjects(hub: Hub): void {
    this.isLoading = true;
    this.error = null;
    this.selectedHub = hub;

    this.browserService.getProjects(hub.id).subscribe({
      next: projects => {
        this.projects = projects;
        this.step = 'project';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load projects. Please try again';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onHubClick(hub: Hub): void {
    this.loadProjects(hub);
  }

  onProjectClick(project: Project):void {
    const hubId = encodeURIComponent(this.selectedHub!.id);
    const projectId = encodeURIComponent(project.project_id);
    this.router.navigate(['/dashboard', hubId, projectId]);
  }

  onBackClick(): void {
    this.selectedHub = null;
    this.projects = [];
    this.loadHubs();
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next:() => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  getTypeLabel(type: string): string {
    if (type?.toLowerCase().includes('acc')) return 'ACC';
    if (type?.toLowerCase().includes('bim360')) return 'BIM 360';
    return type;
  }
}
