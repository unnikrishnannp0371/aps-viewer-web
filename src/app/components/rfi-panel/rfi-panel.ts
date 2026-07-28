// src/app/components/rfi-panel/rfi-panel.ts
//
// Backend now returns the full filtered set (no server-side pagination) —
// allRfis holds it, columnFilters + displayedRfis do client-side
// filtering/pagination on top. Status/Discipline/Assignee dropdowns still
// trigger a backend refetch (coarse filters); column filters and paging
// are local only.

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rfi, RfiAttention, RfiFilters, RfiService, RfiSummary, RiskLevel } from '../../services/rfi';

interface StatusTab {
  key:   string;
  value: string;
}

interface StatusBar {
  key:   string;
  label: string;
  count: number;
  width: string;
}

interface ColumnFilters {
  rfiNumber:  string;
  subject:    string;
  status:     string; // 'all' | status key
  assignedTo: string;
  dueDate:    string;
  priority:   string; // 'all' | priority value
  risk:       string; // 'all' | RiskLevel
}

@Component({
  standalone:          true,
  selector:            'app-rfi-panel',
  changeDetection:     ChangeDetectionStrategy.OnPush,
  imports:             [CommonModule, FormsModule],
  templateUrl:         './rfi-panel.html',
  styleUrl:            './rfi-panel.css'
})
export class RfiPanel implements OnInit, OnChanges {
  @Input() hubId:     string | null = null;
  @Input() projectId: string | null = null;

  summary:  RfiSummary | null = null;
  loading  = false;
  error:    string | null = null;

  // ── Filter state ───────────────────────────────────────────────────────────
  activeFilter: RfiFilters = {};
  activeStatus     = 'all';
  activeDiscipline = 'all';
  activeAssignee   = 'all';
  currentPage  = 0;
  pageSize     = 20;
  overallTotal = 0;

  // Full filtered set from the backend (status/discipline/assignee dropdowns
  // already applied). Column filters and pagination operate on this locally.
  allRfis: Rfi[] = [];

  columnFilters: ColumnFilters = {
    rfiNumber: '', subject: '', status: 'all', assignedTo: '',
    dueDate: '', priority: 'all', risk: 'all'
  };

  // Drives the Needs Attention cards → filters the table below.
  // Matches the definition behind summary.attention counts.
  attentionFilter: 'all' | 'overdue' | 'high_priority' | 'cost_or_schedule' = 'all';
  private readonly ACTIVE_STATUSES = ['open', 'submitted', 'answered'];

  @ViewChild('tableWrap') tableWrapRef?: ElementRef<HTMLElement>;
  tableFlash = false;

  // ── Expand state ──────────────────────────────────────────────────────────
  expandedRowId: string | null = null;

  readonly statusList: StatusTab[] = [
    { key: 'all',       value: 'All' },
    { key: 'open',      value: 'Open' },
    { key: 'submitted', value: 'Submitted' },
    { key: 'answered',  value: 'Answered' },
    { key: 'closed',    value: 'Closed' },
  ];

  constructor(
    private rfiService: RfiService,
    private cdr:        ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.projectId) this.loadRfis();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && !changes['projectId'].firstChange) {
      this.rfiService.clearCache(this.projectId!);
      this.currentPage      = 0;
      this.activeStatus     = 'all';
      this.activeDiscipline = 'all';
      this.activeAssignee   = 'all';
      this.activeFilter     = {};
      this.overallTotal     = 0;
      this.resetColumnFilters(false);
      this.loadRfis();
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentPageDisplay(): number { return this.currentPage + 1; }

  get filteredRfis(): Rfi[] {
    const f = this.columnFilters;
    return this.allRfis.filter(r => {
      if (f.rfiNumber && !(r.rfi_number ?? '').toLowerCase().includes(f.rfiNumber.toLowerCase())) return false;
      if (f.subject && !(r.subject || '').toLowerCase().includes(f.subject.toLowerCase())) return false;
      if (f.status !== 'all' && r.status !== f.status) return false;
      if (f.assignedTo && !(r.assigned_to ?? '').toLowerCase().includes(f.assignedTo.toLowerCase())) return false;
      if (f.dueDate && !this.isSameDay(r.due_date, f.dueDate)) return false;
      if (f.priority !== 'all' && (r.priority ?? '') !== f.priority) return false;
      if (f.risk !== 'all' && r.risk_level !== f.risk) return false;
      if (!this.matchesAttentionFilter(r)) return false;
      return true;
    });
  }

  // Mirrors RfisService#attention_reason (Ruby) exactly — keep in sync.
  private matchesAttentionFilter(r: Rfi): boolean {
    if (this.attentionFilter === 'all') return true;
    return this.attentionReason(r) === this.attentionFilter;
  }

  private attentionReason(r: Rfi): 'overdue' | 'high_priority' | 'cost_or_schedule' | null {
    if (!this.ACTIVE_STATUSES.includes(r.status)) return null;
    if (r.due_date && new Date(r.due_date) < new Date()) return 'overdue';
    if (r.priority === 'High') return 'high_priority';
    if (r.cost_impact === 'Yes' || r.schedule_impact === 'Yes') return 'cost_or_schedule';
    return null;
  }

  get totalRfis(): number  { return this.filteredRfis.length; }
  get totalPages(): number { return Math.ceil(this.totalRfis / this.pageSize) || 1; }

  get displayedRfis(): Rfi[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredRfis.slice(start, start + this.pageSize);
  }

  get statusBars(): StatusBar[] {
    if (!this.summary) return [];
    const c   = this.summary.by_status;
    const max = Math.max(c.open, c.submitted, c.answered, c.closed, 1);
    return [
      { key: 'open',      label: 'Open',      count: c.open,      width: `${(c.open      / max) * 100}%` },
      { key: 'submitted', label: 'Submitted', count: c.submitted, width: `${(c.submitted / max) * 100}%` },
      { key: 'answered',  label: 'Answered',  count: c.answered,  width: `${(c.answered  / max) * 100}%` },
      { key: 'closed',    label: 'Closed',    count: c.closed,    width: `${(c.closed    / max) * 100}%` },
    ];
  }

  get disciplineOptions(): string[] {
    return this.summary?.by_discipline ? Object.keys(this.summary.by_discipline) : [];
  }

  get assigneeOptions(): string[] {
    return this.summary?.by_assignee ? Object.keys(this.summary.by_assignee) : [];
  }

  get priorityOptions(): string[] {
    return [...new Set(this.allRfis.map(r => r.priority).filter((p): p is string => !!p))];
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadRfis(): void {
    if (!this.projectId || !this.hubId) return;

    const cached = this.rfiService.getCachedSummary(this.projectId);

    this.loading = true;
    this.error   = null;

    this.rfiService.getRfisSummary(
      this.hubId,
      this.projectId,
      this.activeFilter
    ).subscribe({
      next: data => {
        this.summary = cached
          ? { ...data, by_status: cached.by_status, by_discipline: cached.by_discipline,
              by_assignee: cached.by_assignee, attention: cached.attention }
          : data;
        this.allRfis = data.rfis;
        if (this.activeStatus === 'all' && this.activeDiscipline === 'all' && this.activeAssignee === 'all') {
          this.overallTotal = data.total;
        }
        this.loading   = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error   = 'Failed to load RFIs. Please try again.';
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

  onDisciplineFilter(discipline: string): void {
    this.activeDiscipline = discipline;
    this.applyFilters();
  }

  onAssigneeFilter(assignee: string): void {
    this.activeAssignee = assignee;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.activeFilter = {};
    if (this.activeStatus     !== 'all') this.activeFilter.status      = this.activeStatus;
    if (this.activeDiscipline !== 'all') this.activeFilter.discipline  = this.activeDiscipline;
    if (this.activeAssignee   !== 'all') this.activeFilter.assigned_to = this.activeAssignee;

    this.currentPage   = 0;
    this.expandedRowId = null;
    this.loadRfis();
  }

  get hasActiveFilters(): boolean {
    return this.activeStatus !== 'all' || this.activeDiscipline !== 'all' || this.activeAssignee !== 'all';
  }

  resetFilters(): void {
    this.activeStatus     = 'all';
    this.activeDiscipline = 'all';
    this.activeAssignee   = 'all';
    this.applyFilters();
  }

  // ── Column filters (client-side, over the full loaded set) ─────────────────

  toggleAttentionFilter(kind: 'overdue' | 'high_priority' | 'cost_or_schedule'): void {
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
    return !!(f.rfiNumber || f.subject || f.assignedTo || f.dueDate) ||
      f.status !== 'all' || f.priority !== 'all' || f.risk !== 'all' || this.attentionFilter !== 'all';
  }

  resetColumnFilters(markForCheck = true): void {
    this.columnFilters = {
      rfiNumber: '', subject: '', status: 'all', assignedTo: '',
      dueDate: '', priority: 'all', risk: 'all'
    };
    this.attentionFilter = 'all';
    this.currentPage = 0;
    if (markForCheck) this.cdr.markForCheck();
  }

  toggleRow(id: string): void {
    this.expandedRowId = this.expandedRowId === id ? null : id;
    this.cdr.markForCheck();
  }

  isExpanded(id: string): boolean {
    return this.expandedRowId === id;
  }

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

  // ── Attention helpers ──────────────────────────────────────────────────────

  attentionLabel(attention: RfiAttention): string {
    if (attention.overdue > 0)          return `${attention.overdue} overdue`;
    if (attention.high_priority > 0)    return `${attention.high_priority} high priority`;
    if (attention.cost_or_schedule > 0) return `${attention.cost_or_schedule} with impact`;
    return 'All clear';
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  statusClass(status: string): string {
    const map: Record<string, string> = {
      open:            'badge-open',
      submitted:       'badge-submitted',
      answered:        'badge-answered',
      answeredManager: 'badge-answered',
      openRev2:        'badge-open',
      answeredRev1:    'badge-answered',
      closed:          'badge-closed',
    };
    return map[status] ?? 'badge-default';
  }

  formatStatus(status: string): string {
    const labels: Record<string, string> = {
      open:            'Open',
      submitted:       'Submitted',
      answered:        'Answered',
      answeredManager: 'Answered',
      openRev2:        'Open',
      answeredRev1:    'Answered',
      closed:          'Closed',
    };
    return labels[status] ?? status;
  }

  riskClass(risk: RiskLevel): string {
    return {
      high:   'risk-high',
      medium: 'risk-medium',
      low:    'risk-low',
    }[risk] ?? 'risk-low';
  }

  riskLabel(risk: RiskLevel): string {
    return { high: 'High', medium: 'Med', low: 'Low' }[risk] ?? '–';
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  private isSameDay(dateStr: string | null, filterValue: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr).toISOString().slice(0, 10) === filterValue;
  }

  // Days between created_at and updated_at, for closed RFIs only.
  // No closed_at field exists — updated_at is the same proxy the backend
  // already uses for avg_response_days.
  daysToClose(rfi: Rfi): string {
    if (rfi.status !== 'closed') return '—';
    const created = new Date(rfi.created_at).getTime();
    const updated = new Date(rfi.updated_at).getTime();
    return `${Math.round((updated - created) / 86400000)}d`;
  }

  statusCount(status: keyof Pick<RfiAttention, never>): number {
    return this.summary?.by_status?.[status as keyof typeof this.summary.by_status] ?? 0;
  }
}
