import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { RiskLevel, Submittal, SubmittalAttention, SubmittalFilters, SubmittalsService, SubmittalSummary } from '../../services/submittals';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  number:     string;
  title:      string;
  spec:       string;
  status:     string; // 'all' | status key
  ballInCourt: string;
  dueDate:    string;
  priority:   string; // 'all' | priority value
  risk:       string; // 'all' | RiskLevel
}

@Component({
  selector: 'app-submittals-panel',
  imports: [CommonModule, FormsModule],
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
  activeStatus  = 'all';
  activeSpec    = 'all';
  activeManager = 'all';
  currentPage  = 0;
  pageSize     = 20;
  overallTotal = 0;

  // Full filtered set from the backend (status/spec/manager dropdowns already
  // applied). Column filters and pagination operate on this locally.
  allSubmittals: Submittal[] = [];

  columnFilters: ColumnFilters = {
    number: '', title: '', spec: '', status: 'all', ballInCourt: '',
    dueDate: '', priority: 'all', risk: 'all'
  };

  // Drives the Needs Attention cards → filters the table below.
  // Matches the definition behind summary.attention counts.
  attentionFilter: 'all' | 'overdue' | 'awaiting_review' | 'high_priority' = 'all';
  private readonly ACTIVE_STATUSES = ['required', 'open', 'draft'];

  @ViewChild('tableWrap') tableWrapRef?: ElementRef<HTMLElement>;
  tableFlash = false;

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
      this.activeSpec    = 'all';
      this.activeManager = 'all';
      this.activeFilter = {};
      this.overallTotal  = 0;
      this.resetColumnFilters(false);
      this.loadSubmittals();
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentPageDisplay(): number { return this.currentPage + 1; }

  get filteredSubmittals(): Submittal[] {
    const f = this.columnFilters;
    return this.allSubmittals.filter(s => {
      if (f.number && !(s.submittal_number ?? '').toLowerCase().includes(f.number.toLowerCase())) return false;
      if (f.title && !(s.title || '').toLowerCase().includes(f.title.toLowerCase())) return false;
      if (f.spec) {
        const specText = `${s.spec_identifier ?? ''} ${s.spec_title ?? ''}`.toLowerCase();
        if (!specText.includes(f.spec.toLowerCase())) return false;
      }
      if (f.status !== 'all' && s.status !== f.status) return false;
      if (f.ballInCourt && !s.ball_in_court.join(', ').toLowerCase().includes(f.ballInCourt.toLowerCase())) return false;
      if (f.dueDate && !this.isSameDay(s.effective_due_date, f.dueDate)) return false;
      if (f.priority !== 'all' && (s.priority ?? '') !== f.priority) return false;
      if (f.risk !== 'all' && s.risk_level !== f.risk) return false;
      if (!this.matchesAttentionFilter(s)) return false;
      return true;
    });
  }

  // Mirrors SubmittalsService#attention_reason (Ruby) exactly — keep in sync.
  private matchesAttentionFilter(s: Submittal): boolean {
    if (this.attentionFilter === 'all') return true;
    return this.attentionReason(s) === this.attentionFilter;
  }

  private attentionReason(s: Submittal): 'overdue' | 'awaiting_review' | 'high_priority' | null {
    if (!this.ACTIVE_STATUSES.includes(s.status)) return null;
    if (s.effective_due_date && new Date(s.effective_due_date) < new Date()) return 'overdue';
    if (s.sent_to_review && !s.received_from_review) return 'awaiting_review';
    if (s.priority === 'High') return 'high_priority';
    return null;
  }

  get totalSubmittals(): number { return this.filteredSubmittals.length; }
  get totalPages(): number      { return Math.ceil(this.totalSubmittals / this.pageSize) || 1; }

  get displayedSubmittals(): Submittal[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredSubmittals.slice(start, start + this.pageSize);
  }

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

  get specOptions(): string[] {
    return this.summary?.by_spec ? Object.keys(this.summary.by_spec) : [];
  }

  get managerOptions(): string[] {
    return this.summary?.by_manager ? Object.keys(this.summary.by_manager) : [];
  }

  get priorityOptions(): string[] {
    return [...new Set(this.allSubmittals.map(s => s.priority).filter((p): p is string => !!p))];
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadSubmittals(): void {
    if (!this.projectId) return;

    const cached = this.submittalService.getCachedSummary(this.projectId);

    this.loading = true;
    this.error   = null;

    this.submittalService.getSubmittalsSummary(
      this.projectId,
      this.activeFilter
    ).subscribe({
      next: data => {
        this.summary = cached
          ? { ...data, by_status: cached.by_status, by_spec: cached.by_spec,
              by_manager: cached.by_manager, attention: cached.attention }
          : data;
        this.allSubmittals = data.submittals;
        if (this.activeStatus === 'all' && this.activeSpec === 'all' && this.activeManager === 'all') {
          this.overallTotal = data.total;
        }
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
    this.activeStatus = status;
    this.applyFilters();
  }

  onSpecFilter(spec: string): void {
    this.activeSpec = spec;
    this.applyFilters();
  }

  onManagerFilter(manager: string): void {
    this.activeManager = manager;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.activeFilter = {};
    if (this.activeStatus  !== 'all') this.activeFilter.status_id = this.STATUS_ID_MAP[this.activeStatus];
    if (this.activeSpec    !== 'all') this.activeFilter.spec      = this.activeSpec;
    if (this.activeManager !== 'all') this.activeFilter.manager   = this.activeManager;

    this.currentPage   = 0;
    this.expandedRowId = null;
    this.loadSubmittals();
  }

  get hasActiveFilters(): boolean {
    return this.activeStatus !== 'all' || this.activeSpec !== 'all' || this.activeManager !== 'all';
  }

  resetFilters(): void {
    this.activeStatus  = 'all';
    this.activeSpec    = 'all';
    this.activeManager = 'all';
    this.applyFilters();
  }

  // ── Column filters (client-side, over the full loaded set) ─────────────────

  toggleAttentionFilter(kind: 'overdue' | 'awaiting_review' | 'high_priority'): void {
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
    return !!(f.number || f.title || f.spec || f.ballInCourt || f.dueDate) ||
      f.status !== 'all' || f.priority !== 'all' || f.risk !== 'all' || this.attentionFilter !== 'all';
  }

  resetColumnFilters(markForCheck = true): void {
    this.columnFilters = {
      number: '', title: '', spec: '', status: 'all', ballInCourt: '',
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

  private isSameDay(dateStr: string | null, filterValue: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr).toISOString().slice(0, 10) === filterValue;
  }

  statusCount(status: keyof Pick<SubmittalAttention, never>): number {
    return this.summary?.by_status?.[status as keyof typeof this.summary.by_status] ?? 0;
  }
}
