// src/app/components/project-dashboard/project-dashboard.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BrowserService } from '../../services/browser';
import { IssuesPanel, IssueViewerEvent } from '../issues-panel/issues-panel';
import { DashboardViewer, ViewerTarget } from '../dashboard-viewer/dashboard-viewer';
import { HealthPanel } from '../health-panel/health-panel';
import { RfiPanel } from '../rfi-panel/rfi-panel';
import { SubmittalsPanel } from '../submittals-panel/submittals-panel';
import { ClashesPanel } from '../clashes-panel/clashes-panel';
import { ProjectHealth } from '../../services/health';

export type DashboardTab = 'issues' | 'rfi' | 'submittals' | 'clashes';
export interface Tab {
  key:     DashboardTab;
  label:   string;
  ready:   boolean;  // false = stub, renders disabled
}

@Component({
  standalone: true,
  selector: 'app-project-dashboard',
  imports: [
    CommonModule,
    IssuesPanel,
    DashboardViewer,
    HealthPanel,
    RfiPanel,
    SubmittalsPanel,
    ClashesPanel
  ],
  templateUrl: './project-dashboard.html',
  styleUrl: './project-dashboard.css'
})
export class ProjectDashboard implements OnInit {

  hubId:     string = '';
  projectId: string = '';
  projectName:      string = '';
  isLoadingProject          = true;

  viewerTarget: ViewerTarget | null = null;
  healthTotals: ProjectHealth['totals'] | null = null;

  // ── Tab state ─────────────────────────────────────────────────────────────

  activeTab: DashboardTab = 'issues';

  readonly tabs: Tab[] = [
    { key: 'issues',     label: 'Issues',     ready: true  },
    { key: 'rfi',        label: 'RFIs',       ready: true  },
    { key: 'submittals', label: 'Submittals', ready: true },
    { key: 'clashes',    label: 'Clashes',    ready: true },
  ];

  constructor(
    private route:          ActivatedRoute,
    private router:         Router,
    private browserService: BrowserService,
    private cdr:            ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.hubId     = decodeURIComponent(params['hubId']);
      this.projectId = decodeURIComponent(params['projectId']);
      this.loadProjectName();
    });
  }

  private loadProjectName(): void {
    this.browserService.getProjects(this.hubId).subscribe({
      next: projects => {
        const match          = projects.find(p => p.project_id === this.projectId);
        this.projectName      = match?.name ?? 'Project Dashboard';
        this.isLoadingProject = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.projectName      = 'Project Dashboard';
        this.isLoadingProject = false;
        this.cdr.detectChanges();
      }
    });
  }

  private readonly totalsKeyMap: Record<DashboardTab, keyof ProjectHealth['totals']> = {
    issues: 'issues',
    rfi: 'rfis',
    submittals: 'submittals',
    clashes: 'clashes'
  };

  // ── Tab switching ─────────────────────────────────────────────────────────

  selectTab(tab: Tab): void {
    if (!tab.ready) return;
    this.activeTab = tab.key;
    this.viewerTarget = null;
  }

  isActive(key: DashboardTab): boolean {
    return this.activeTab === key;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  onBackToPicker(): void {
    this.router.navigate(['/dashboard']);
  }

  // ── Viewer integration ────────────────────────────────────────────────────

  onIssueSelected(event: IssueViewerEvent): void {
    if (!event.issue.pushpin) return;
    if (!event.viewableId)    return;
    if (this.viewerTarget?.urn === event.viewableId) return;

    this.viewerTarget = {
      urn:        event.viewableId,
      pushpin:    event.issue.pushpin,
      issueTitle: event.issue.title
    };
  }

  onViewerClosed(): void {
    this.viewerTarget = null;
  }

  onHealthLoaded(health: ProjectHealth): void {
    this.healthTotals = health.totals;
  }

  tabTotal(key: DashboardTab): number | null {
    return this.healthTotals ? this.healthTotals[this.totalsKeyMap[key]] : null;
  }
}