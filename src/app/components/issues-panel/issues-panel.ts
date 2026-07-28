// src/app/components/issues-panel/issues-panel.ts
//
// Changes from previous version:
//   1. Added expandedRowId — clicking › expands detail row (description, location, type)
//   2. Added topTypes getter aligned with bar chart (modifier CSS classes, not inline style)
//   3. Added riskClass / riskLabel helpers — mirrors rfi-panel pattern
//   4. statusClass now includes pending / in_review
//   5. onIssueClick kept — viewer integration unchanged
//   6. statusBars getter added — same pattern as rfi-panel for bar chart
//   7. Backend now returns the full filtered set (no server-side pagination) —
//      allIssues holds it, columnFilters + displayedIssues do client-side
//      filtering/pagination on top. Status/Type/Assignee dropdowns still
//      trigger a backend refetch (coarse filters); column filters and paging
//      are local only.

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

interface ColumnFilters {
  id:         string;
  title:      string;
  createdBy:  string;
  assignedTo: string;
  risk:       string; // 'all' | RiskLevel
  status:     string; // 'all' | status key
  createdAt:  string;
  dueDate:    string;
}

@Component({
  standalone:      true,
  selector:        'app-issues-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [CommonModule, FormsModule],
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
  activeStatus   = 'all';
  activeType     = 'all';
  activeAssignee = 'all';
  currentPage   = 0;
  pageSize      = 20;
  overallTotal = 0;

  // Full filtered set from the backend (status/type/assignee dropdowns already
  // applied). Column filters and pagination below operate on this locally.
  allIssues: Issue[] = [];

  columnFilters: ColumnFilters = {
    id: '', title: '', createdBy: '', assignedTo: '',
    risk: 'all', status: 'all', createdAt: '', dueDate: ''
  };

  // Drives the Needs Attention cards → filters the table below.
  // Matches the same definition used for summary.attention counts:
  // active status (open/pending/in_review) + the relevant condition.
  attentionFilter: 'all' | 'overdue' | 'unassigned' | 'stale' = 'all';
  private readonly ACTIVE_STATUSES = ['open', 'pending', 'in_review'];

  @ViewChild('tableWrap') tableWrapRef?: ElementRef<HTMLElement>;
  tableFlash = false;

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
      this.currentPage    = 0;
      this.activeStatus   = 'all';
      this.activeType     = 'all';
      this.activeAssignee = 'all';
      this.activeFilter   = {};
      this.overallTotal   = 0;
      this.resetColumnFilters(false);
      this.loadIssues();
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentPageDisplay(): number { return this.currentPage + 1; }

  get filteredIssues(): Issue[] {
    const f = this.columnFilters;
    return this.allIssues.filter(i => {
      if (f.id && !`${i.display_id || i.id}`.toLowerCase().includes(f.id.toLowerCase())) return false;
      if (f.title && !(i.title || '').toLowerCase().includes(f.title.toLowerCase())) return false;
      if (f.createdBy && !(i.created_by || '').toLowerCase().includes(f.createdBy.toLowerCase())) return false;
      if (f.assignedTo && !(i.assigned_to || '').toLowerCase().includes(f.assignedTo.toLowerCase())) return false;
      if (f.risk !== 'all' && i.risk_level !== f.risk) return false;
      if (f.status !== 'all' && i.status !== f.status) return false;
      if (f.createdAt && !this.isSameDay(i.created_at, f.createdAt)) return false;
      if (f.dueDate && !this.isSameDay(i.due_date, f.dueDate)) return false;
      if (!this.matchesAttentionFilter(i)) return false;
      return true;
    });
  }

  // Mirrors IssuesService#attention_reason (Ruby) exactly — each issue gets
  // at most one reason, same priority order, so the filtered row count
  // always matches the card's count. Keep these two in sync if either changes.
  private matchesAttentionFilter(i: Issue): boolean {
    if (this.attentionFilter === 'all') return true;
    return this.attentionReason(i) === this.attentionFilter;
  }

  private attentionReason(i: Issue): 'overdue' | 'stale' | 'unassigned' | null {
    if (!this.ACTIVE_STATUSES.includes(i.status)) return null;
    if (i.due_date && new Date(i.due_date) < new Date()) return 'overdue';
    if (i.status === 'open') {
      const ageDays = (Date.now() - new Date(i.created_at).getTime()) / 86400000;
      if (ageDays > 30) return 'stale';
    }
    if (!i.assigned_to) return 'unassigned';
    return null;
  }

  get totalIssues(): number { return this.filteredIssues.length; }
  get totalPages(): number  { return Math.ceil(this.totalIssues / this.pageSize) || 1; }

  get displayedIssues(): Issue[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredIssues.slice(start, start + this.pageSize);
  }

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

  get typeOptions(): string[] {
    return this.summary?.by_type ? Object.keys(this.summary.by_type) : [];
  }

  get assigneeOptions(): string[] {
    return this.summary?.by_assignee ? Object.keys(this.summary.by_assignee) : [];
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadIssues(): void {
    if (!this.projectId || !this.hubId) return;

    // Use cached summary data if available — avoids re-fetching
    // by_status, by_type, attention on filter changes
    const cached = this.issuesService.getCachedSummary(this.projectId);

    this.loading = true;
    this.error   = null;

    this.issuesService.getIssuesSummary(
      this.hubId,
      this.projectId,
      this.activeFilter
    ).subscribe({
        next: data => {
          this.summary = cached
            ? { ...data, by_status: cached.by_status, by_type: cached.by_type,
                by_assignee: cached.by_assignee, attention: cached.attention }
            : data;
          this.allIssues = data.issues;
          if (this.activeStatus === 'all' && this.activeType === 'all' && this.activeAssignee === 'all') {
            this.overallTotal = data.total;
          }
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
    this.activeStatus = status;
    this.applyFilters();
  }

  onTypeFilter(type: string): void {
    this.activeType = type;
    this.applyFilters();
  }

  onAssigneeFilter(assignee: string): void {
    this.activeAssignee = assignee;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.activeFilter = {};
    if (this.activeStatus   !== 'all') this.activeFilter.status      = this.activeStatus;
    if (this.activeType     !== 'all') this.activeFilter.type        = this.activeType;
    if (this.activeAssignee !== 'all') this.activeFilter.assigned_to = this.activeAssignee;

    this.currentPage   = 0;
    this.expandedRowId = null;
    this.loadIssues();
  }

  get hasActiveFilters(): boolean {
    return this.activeStatus !== 'all' || this.activeType !== 'all' || this.activeAssignee !== 'all';
  }

  resetFilters(): void {
    this.activeStatus   = 'all';
    this.activeType     = 'all';
    this.activeAssignee = 'all';
    this.applyFilters();
  }

  // ── Column filters (client-side, over the full loaded set) ─────────────────

  toggleAttentionFilter(kind: 'overdue' | 'unassigned' | 'stale'): void {
    this.attentionFilter = this.attentionFilter === kind ? 'all' : kind;
    this.currentPage = 0;
    this.expandedRowId = null;
    this.cdr.markForCheck();
    if (this.attentionFilter !== 'all') this.flashTable();
  }

  private flashTable(): void {
    this.tableWrapRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    this.tableFlash = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.tableFlash = false;
      this.cdr.markForCheck();
    }, 600);
  }

  setColumnFilter(key: keyof ColumnFilters, value: string): void {
    this.columnFilters = { ...this.columnFilters, [key]: value };
    this.currentPage = 0;
    this.cdr.markForCheck();
  }

  get hasColumnFilters(): boolean {
    const f = this.columnFilters;
    return !!(f.id || f.title || f.createdBy || f.assignedTo || f.createdAt || f.dueDate) ||
      f.risk !== 'all' || f.status !== 'all' || this.attentionFilter !== 'all';
  }

  resetColumnFilters(markForCheck = true): void {
    this.columnFilters = {
      id: '', title: '', createdBy: '', assignedTo: '',
      risk: 'all', status: 'all', createdAt: '', dueDate: ''
    };
    this.attentionFilter = 'all';
    this.currentPage = 0;
    if (markForCheck) this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  prevPage(): void {
    if (this.currentPage === 0) return;
    this.currentPage--;
    this.cdr.markForCheck();
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

  // filterValue comes from <input type="date"> as "YYYY-MM-DD". Compares
  // calendar day in UTC, since toISOString() is always UTC regardless of
  // the browser's local timezone.
  private isSameDay(dateStr: string | null, filterValue: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr).toISOString().slice(0, 10) === filterValue;
  }

  // Days between created_at and updated_at, for closed issues only.
  // There is no closed_at field — updated_at is the proxy already used
  // server-side for the avg_resolution attention metric.
  daysToClose(issue: Issue): string {
    if (issue.status !== 'closed') return '—';
    const created = new Date(issue.created_at).getTime();
    const updated = new Date(issue.closed_at).getTime();
    return `${Math.round((updated - created) / 86400000)}d`;
  }
}
