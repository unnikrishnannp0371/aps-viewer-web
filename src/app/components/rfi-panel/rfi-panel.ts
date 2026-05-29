// src/app/components/rfi-panel/rfi-panel.ts

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RfiAttention, RfiFilters, RfiService, RfiSummary, RiskLevel } from '../../services/rfi';

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
  standalone:          true,
  selector:            'app-rfi-panel',
  changeDetection:     ChangeDetectionStrategy.OnPush,
  imports:             [CommonModule],
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
  activeStatus = 'all';
  currentPage  = 0;
  pageSize     = 20;
  totalRfis    = 0;

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
      this.currentPage  = 0;
      this.activeStatus = 'all';
      this.activeFilter = {};
      this.loadRfis();
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentPageDisplay(): number { return this.currentPage + 1; }

  get totalPages(): number { return Math.ceil(this.totalRfis / this.pageSize); }

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

  // ── Data loading ───────────────────────────────────────────────────────────

  loadRfis(): void {
    if (!this.projectId || !this.hubId) return;

    this.loading = true;
    this.error   = null;

    this.rfiService.getRfisSummary(
      this.hubId,
      this.projectId,
      this.activeFilter,
      this.pageSize,
      this.currentPage * this.pageSize
    ).subscribe({
      next: data => {
        this.summary   = data;
        this.totalRfis = data.total;
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
    this.activeFilter = status === 'all' ? {} : { status };
    this.currentPage  = 0;
    this.expandedRowId = null;
    this.loadRfis();
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
    this.loadRfis();
  }

  prevPage(): void {
    if (this.currentPage === 0) return;
    this.currentPage--;
    this.loadRfis();
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

  statusCount(status: keyof Pick<RfiAttention, never>): number {
    return this.summary?.by_status?.[status as keyof typeof this.summary.by_status] ?? 0;
  }
}