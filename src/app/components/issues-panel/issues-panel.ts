// src/app/components/issues-panel/issues-panel.ts
//
// Changes from previous version:
//   1. Added expandedRowId — clicking › expands detail row (description, location, type)
//   2. Added topTypes getter aligned with bar chart (modifier CSS classes, not inline style)
//   3. Added riskClass / riskLabel helpers — mirrors rfi-panel pattern
//   4. statusClass now includes pending / in_review
//   5. onIssueClick kept — viewer integration unchanged
//   6. statusBars getter added — same pattern as rfi-panel for bar chart

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Issue,
  IssueAttention,
  IssueFilters,
  IssuesService,
  IssuesSummary,
  RiskLevel
} from '../../services/issues';

export interface IssueViewerEvent {
  issue:      Issue;
  viewableId: string;
}

@Component({
  standalone:      true,
  selector:        'app-issues-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [CommonModule],
  templateUrl:     './issues-panel.html',
  styleUrl:        './issues-panel.css'
})
export class IssuesPanel implements OnInit, OnChanges {
  @Input()  hubId:     string | null = null;
  @Input()  projectId: string | null = null;
  @Output() issueSelected = new EventEmitter<IssueViewerEvent>();

  summary: IssuesSummary | null = null;
  loading  = false;
  error:    string | null = null;

  activeFilter: IssueFilters = {};
  activeStatus  = 'all';
  currentPage   = 0;
  pageSize      = 20;
  totalIssues   = 0;

  expandedRowId: string | null = null;

  readonly statusList = [
    { key: 'all',       value: 'All' },
    { key: 'open',      value: 'Open' },
    { key: 'pending',   value: 'Pending' },
    { key: 'in_review', value: 'In Review' },
    { key: 'closed',    value: 'Closed' },
    { key: 'draft',     value: 'Draft' },
  ];

  constructor(
    private issuesService: IssuesService,
    private cdr:           ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.projectId) this.loadIssues();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && !changes['projectId'].firstChange) {
      this.issuesService.clearCache(this.projectId!);
      this.currentPage   = 0;
      this.activeStatus  = 'all';
      this.activeFilter  = {};
      this.loadIssues();
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentPageDisplay(): number { return this.currentPage + 1; }
  get totalPages(): number         { return Math.ceil(this.totalIssues / this.pageSize); }
  get displayedIssues(): Issue[]   { return this.summary?.issues ?? []; }

  get topTypes(): { name: string; count: number; width: string }[] {
    if (!this.summary?.by_type) return [];
    const entries = Object.entries(this.summary.by_type);
    const max     = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([name, count]) => ({
      name,
      count,
      width: `${Math.round((count / max) * 100)}%`
    }));
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadIssues(): void {
    if (!this.projectId || !this.hubId) return;

    // Use cached summary data if available — avoids re-fetching
    // by_status, by_type, attention on pagination/filter changes
    const cached = this.issuesService.getCachedSummary(this.projectId);

    this.loading = true;
    this.error   = null;

    this.issuesService.getIssuesSummary(
      this.hubId,
      this.projectId,
      this.activeFilter,
      this.pageSize,
      this.currentPage * this.pageSize
    ).subscribe({
      next: data => {
        this.summary = cached
          ? { ...data, by_status: cached.by_status, by_type: cached.by_type,
              by_assignee: cached.by_assignee, attention: cached.attention }
          : data;
        this.totalIssues = data.total;
        this.loading     = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error   = 'Failed to load issues. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Interactions ───────────────────────────────────────────────────────────

  onStatusFilter(status: string): void {
    this.activeStatus  = status;
    this.activeFilter  = status === 'all' ? {} : { status };
    this.currentPage   = 0;
    this.expandedRowId = null;
    this.loadIssues();
  }

  // Row click → viewer (existing behaviour, unchanged)
  onIssueClick(issue: Issue): void {
    if (!issue.pushpin) return;
    this.issueSelected.emit({ issue, viewableId: issue.viewable_id ?? '' });
  }

  // Chevron click → expand detail (new)
  toggleRow(event: Event, id: string): void {
    event.stopPropagation();   // don't trigger onIssueClick
    this.expandedRowId = this.expandedRowId === id ? null : id;
    this.cdr.markForCheck();
  }

  isExpanded(id: string): boolean { return this.expandedRowId === id; }

  nextPage(): void {
    if (this.currentPageDisplay >= this.totalPages) return;
    this.currentPage++;
    this.loadIssues();
  }

  prevPage(): void {
    if (this.currentPage === 0) return;
    this.currentPage--;
    this.loadIssues();
  }

  statusCount(status: keyof IssuesSummary['by_status']): number {
    return this.summary?.by_status[status] ?? 0;
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  riskClass(risk: RiskLevel): string {
    return { high: 'risk-high', medium: 'risk-medium', low: 'risk-low' }[risk] ?? 'risk-low';
  }

  riskLabel(risk: RiskLevel): string {
    return { high: 'High', medium: 'Med', low: 'Low' }[risk] ?? '–';
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      open:      'badge-open',
      pending:   'badge-pending',
      in_review: 'badge-in-review',
      closed:    'badge-closed',
      draft:     'badge-draft',
      void:      'badge-void',
    };
    return map[status] ?? 'badge-default';
  }

  formatStatus(status: string): string {
    const labels: Record<string, string> = {
      open:      'Open',
      pending:   'Pending',
      in_review: 'In Review',
      closed:    'Closed',
      draft:     'Draft',
      void:      'Void',
    };
    return labels[status] ?? status;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}
