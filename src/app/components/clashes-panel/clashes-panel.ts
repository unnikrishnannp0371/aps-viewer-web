// src/app/components/clashes-panel/clashes-panel.ts

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
import { ClashesService, ClashesSummary, ClashModelSetSummary } from '../../services/clashes';

@Component({
  standalone:      true,
  selector:        'app-clashes-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [CommonModule],
  templateUrl:     './clashes-panel.html',
  styleUrl:        './clashes-panel.css'
})
export class ClashesPanel implements OnInit, OnChanges {
  @Input() hubId:     string | null = null;
  @Input() projectId: string | null = null;

  summary: ClashesSummary | null = null;
  loading = false;
  error:   string | null = null;

  constructor(
    private clashesService: ClashesService,
    private cdr:            ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.projectId) this.loadClashes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && !changes['projectId'].firstChange) {
      this.clashesService.clearCache(this.projectId!);
      this.loadClashes();
    }
  }

  loadClashes(): void {
    if (!this.projectId || !this.hubId) return;

    const cached = this.clashesService.getCachedSummary(this.projectId);
    if (cached) {
      this.summary = cached;
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error   = null;

    this.clashesService.getClashesSummary(this.hubId, this.projectId).subscribe({
      next: data => {
        this.summary = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error   = 'Failed to load clash data. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  get totalNew():      number { return this.summary?.by_status.new      ?? 0; }
  get totalAssigned(): number { return this.summary?.by_status.assigned  ?? 0; }
  get totalClosed():   number { return this.summary?.by_status.closed    ?? 0; }
  get totalClashes():  number { return this.summary?.total               ?? 0; }

  get modelsets(): ClashModelSetSummary[] {
    return this.summary?.modelsets ?? [];
  }

  // Width % for the per-modelset bar relative to the modelset with most clashes
  modelsetBarWidth(ms: ClashModelSetSummary): string {
    const max = Math.max(...this.modelsets.map(m => m.total), 1);
    return `${Math.round((ms.total / max) * 100)}%`;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}