import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BrowserService, Hub, Project, Folder, FolderItem, BreadcrumbItem } from '../../services/browser';
import { HubList } from './hub-list/hub-list';
import { ProjectList } from './project-list/project-list';
import { FolderList } from './folder-list/folder-list';
import { Breadcrumb } from './breadcrumb/breadcrumb';

type BrowserLevel = 'hubs' | 'projects' | 'folders' | 'contents'

@Component({
  standalone: true,
  selector: 'app-browser',
  imports: [CommonModule, HubList, ProjectList, FolderList, Breadcrumb],
  templateUrl: './browser.html',
  styleUrl: './browser.css',
})

export class Browser implements OnInit {
  level: BrowserLevel = 'hubs';

  hubs: Hub[] = [];
  projects: Project[] = [];
  folders: Folder[] = [];
  contents: FolderItem[] = [];

  selectedHub: Hub| null = null;
  selectedProject: Project | null = null;
  selectedFolder: Folder | null = null;
  selectedFile: FolderItem | null = null;

  breadcrumbs: BreadcrumbItem[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private browserServce: BrowserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadHubs();
  }

  loadHubs(): void {
    this.isLoading = true;
    this.error = null;
    this.browserServce.getHubs().subscribe({
      next : (hubs) => {
        this.hubs = hubs;
        this.level = 'hubs';
        this.breadcrumbs = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error :() =>{
        this.error = "Failed to load hubs";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onHubSelected(hub: Hub): void {
    this.selectedHub = hub;
    this.selectedProject = null;
    this.selectedFolder = null;
    this.selectedFile = null;
    this.breadcrumbs = [ { label: hub.name, level: 'hub', id: hub.id }]
    this.isLoading = true;
    this.error = null;

    this.browserServce.getProjects(hub.id).subscribe({
      next: (projects) => {
        this.projects = projects;
        this.level = 'projects';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error : () => {
        this.error = "Failed to load projects";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onProjectSelected(project: Project): void {
    this.selectedProject = project;
    this.selectedFolder = null;
    this.selectedFile = null;
    this.breadcrumbs = [
      { label: this.selectedHub!.name, level: 'hub', id: this.selectedHub!.id },
      { label: project.name, level: 'project', id: project.project_id, extra: this.selectedHub!.id }
    ]
    this.isLoading = true;
    this.error = null;

    this.browserServce.getFolders(this.selectedHub!.id, project.project_id).subscribe({
      next: (folders) => {
        this.folders = folders;
        this.level = 'folders';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = "Failed to load folders";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFolderSelected(folder: Folder): void {
    this.selectedFolder = folder;
    this.selectedFile = null;

    const projectId = this.selectedProject!.project_id;
    const folderId = folder.folder_id;

    this.breadcrumbs = [
      { label: this.selectedHub!.name, level: 'hub', id: this.selectedHub!.id },
      { label: this.selectedProject!.name, level: 'project', id: projectId, extra: this.selectedHub!.id },
      { label: folder.name, level: 'folder', id: folderId, extra: projectId }
    ];
    this.isLoading = true;
    this.error = null;

    this.browserServce.getFolderContents(projectId, folderId).subscribe({
      next: (contents) => {
        this.contents = contents;
        this.level = 'contents';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load contents';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFileSelected(file: FolderItem): void {
    this.selectedFile = file;
    this.cdr.detectChanges();
  }

  onBreadcrumbClick(crumb: BreadcrumbItem): void {
    if (crumb.level === 'root') {
      this.selectedHub = null;
      this.selectedProject = null;
      this.selectedFolder = null;
      this.selectedFile = null;
      this.breadcrumbs = [];
      this.loadHubs();
    } else if (crumb.level === 'hub') {
      this.onHubSelected(this.selectedHub!);
    } else if (crumb.level === 'project') {
      this.onProjectSelected(this.selectedProject!);
    } else if (crumb.level === 'folder') {
      this.onFolderSelected(this.selectedFolder!);
    }
  }

  onTranslateAndShare (): void {
    console.log("Coming Soon");
  }
}
