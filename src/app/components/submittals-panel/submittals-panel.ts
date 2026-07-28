import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { RiskLevel, SubmittalAttention, SubmittalFilters, SubmittalsService, SubmittalSummary } from '../../services/submittals';
import { CommonModule } from '@angular/common';

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
@Component({
  selector: 'app-submittals-panel',
  imports: [CommonModule],
  templateUrl: './submittals-panel.html',
  styleUrl: './submittals-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class SubmittalsPanel implements OnInit, OnChanges {
  @Input() hubId:     string | null = null;
  @Input() projectId: string | null = null;

  summary:  SubmittalSummary | null = null;
  loading  = false;
  error:    string | null = null;

  // ── Filter state ───────────────────────────────────────────────────────────
  activeFilter: SubmittalFilters = {};
  activeStatus = 'all';
  currentPage  = 0;
  pageSize     = 20;
  totalSubmittals    = 0;

  // ── Expand state ──────────────────────────────────────────────────────────
  expandedRowId: string | null = null;

  readonly statusList: StatusTab[] = [
    { key: 'all',      value: 'All' },
    { key: 'required', value: 'Required' },
    { key: 'open',     value: 'Open' },
    { key: 'closed',   value: 'Closed' },
    { key: 'draft',    value: 'Draft' },
  ];
  constructor(
    private submittalService: SubmittalsService,
    private cdr:        ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.projectId) this.loadSubmittals();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && !changes['projectId'].firstChange) {
      this.submittalService.clearCache(this.projectId!);
      this.currentPage  = 0;
      this.activeStatus = 'all';
      this.activeFilter = {};
      this.loadSubmittals();
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentPageDisplay(): number { return this.currentPage + 1; }

  get totalPages(): number { return Math.ceil(this.totalSubmittals / this.pageSize); }

  get statusBars(): StatusBar[] {
    if (!this.summary) return [];
    const c   = this.summary.by_status;
    const max = Math.max(c.required, c.open, c.closed, 1);
    return [
      { key: 'required',      label: 'Required',      count: c.required,      width: `${(c.required      / max) * 100}%` },
      { key: 'open', label: 'Open', count: c.open, width: `${(c.open / max) * 100}%` },
      { key: 'closed',  label: 'Closed',  count: c.closed,  width: `${(c.closed  / max) * 100}%` },
    ];
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadSubmittals(): void {
    if (!this.projectId) return;

    const cached = this.submittalService.getCachedSummary(this.projectId);

    this.loading = true;
    this.error   = null;

    this.submittalService.getSubmittalsSummary(
      this.projectId,
      this.activeFilter,
      this.pageSize,
      this.currentPage * this.pageSize
    ).subscribe({
      next: data => {
        this.summary = cached
          ? { ...data, by_status: cached.by_status, attention: cached.attention }
          : data;
        this.totalSubmittals = data.total;
        this.loading         = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error   = 'Failed to load Submittals. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Interactions ───────────────────────────────────────────────────────────

  readonly STATUS_ID_MAP: Record<string, string> = {
    required: '1', open: '2', closed: '3',
    void: '4', empty: '5', draft: '6'
  };

  onStatusFilter(status: string): void {
    this.activeStatus  = status;
    this.activeFilter  = status === 'all' ? {} : { status_id: this.STATUS_ID_MAP[status] };
    this.currentPage   = 0;
    this.expandedRowId = null;
    this.loadSubmittals();
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
    this.loadSubmittals();
  }

  prevPage(): void {
    if (this.currentPage === 0) return;
    this.currentPage--;
    this.loadSubmittals();
  }

  // ── Attention helpers ──────────────────────────────────────────────────────

  attentionLabel(attention: SubmittalAttention): string {
    if (attention.overdue > 0)          return `${attention.overdue} overdue`;
    if (attention.high_priority > 0)    return `${attention.high_priority} high priority`;
    if (attention.awaiting_review > 0) return `${attention.awaiting_review} with impact`;
    return 'All clear';
  }

  // ── Display helpers ────────────────────────────────────────────────────────
  statusClass(status: string): string {
    const map: Record<string, string> = {
      required: 'badge-required',
      open:     'badge-open',
      closed:   'badge-closed',
      void:     'badge-void',
      empty:    'badge-draft',
      draft:    'badge-draft',
    };
    return map[status] ?? 'badge-default';
  }

  formatStatus(status: string): string {
    const labels: Record<string, string> = {
      required: 'Required',
      open:     'Open',
      closed:   'Closed',
      void:     'Void',
      empty:    'Empty',
      draft:    'Draft',
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

  statusCount(status: keyof Pick<SubmittalAttention, never>): number {
    return this.summary?.by_status?.[status as keyof typeof this.summary.by_status] ?? 0;
  }
}