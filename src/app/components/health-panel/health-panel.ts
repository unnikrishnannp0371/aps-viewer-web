// Project Health Score panel.
// Shows a single score (0-100), grade, label, domain breakdown,
// and individual signals with severity indicators.
//
// Unique value vs Insights/PowerBI:
//   - Single live score updated on every dashboard load
//   - Cross-domain weighted formula (not just one API)
//   - Extensible — RFI, Submittal, Clash scores plug in automatically
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { HealthService, HealthSignal, ProjectHealth } from '../../services/health';
import { takeUntil, map } from 'rxjs/operators';
import { Subject, Subscription, interval } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-health-panel',
  imports: [CommonModule],
  templateUrl: './health-panel.html',
  styleUrl: './health-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HealthPanel implements OnInit, OnChanges, OnDestroy {
  @Input() hubId!: string;
  @Input() projectId!: string;
  @Output() healthLoaded = new EventEmitter<ProjectHealth>();

  health: ProjectHealth | null = null;
  isLoading = false;
  error: string | null = null;

  readonly domainOrder = ['issues', 'rfis', 'submittals', 'clashes'];
  expandedDomain: string | null = null;

  progress = 0;
  statusText = ""
  private destroy$ = new Subject<void>();
  private progressSub?: Subscription;
  private statusSub?: Subscription;
  private readonly statusMessages = [
    "Analyzing project health...",
    "Checking issues and RFIs...",
    "Evaluating submittals and clashes...",
    "Calculating overall score...",
    "Almost done...",
    "Finishing up...",
  ];

  constructor(
    private healthService: HealthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.projectId) this.loadHealth();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && !changes['projectId'].firstChange) {
      this.loadHealth();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHealth(): void {
    this.isLoading = true;
    this.error = null;
    this.progress = 0;
    this.statusText = this.statusMessages[0];

    const start = Date.now();
    this.progressSub = interval(150).pipe(
      takeUntil(this.destroy$),
      map(() => 90 * (1 - Math.exp(-(Date.now() - start) / 1500)))
    ).subscribe(p => {
      this.progress = p;
      this.cdr.markForCheck();
    });

    this.statusSub = interval(1000).pipe(takeUntil(this.destroy$)).subscribe(i => {
      this.statusText = this.statusMessages[i % this.statusMessages.length];
      this.cdr.markForCheck();
    });
    this.healthService.getHealth(this.hubId, this.projectId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
        next: data => {
          this.progressSub?.unsubscribe();
          this.statusSub?.unsubscribe();
          this.progress = 100;
          this.health = data;
          this.healthLoaded.emit(data);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.progressSub?.unsubscribe();
          this.statusSub?.unsubscribe();
          this.error = 'Failed to load health score.';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
    });
  }

  // ── Template Helpers ───────────────────────────────────────────────────────

  gradeColor(grade: string): string {
    const map: Record<string, string> = {
      A: '#38a169',
      B: '#68d391',
      C: '#dd6b20',
      D: '#e53e3e',
      F: '#742a2a'
    };
    return map[grade] ?? '#9ca3af';
  }

  severityColor(severity: HealthSignal['severity']): string {
    const map = {
      good:     '#38a169',
      warning:  '#dd6b20',
      critical: '#e53e3e'
    };
    return map[severity];
  }

  domainColor(resolved: number, total: number): string {
    const pct = total ? (resolved / total) * 100 : 0;
    if (pct >= 85) return '#38a169';
    if (pct >= 70) return '#68d391';
    if (pct >= 55) return '#dd6b20';
    if (pct >= 40) return '#e53e3e';
    return '#742a2a';
  }

  domainLabel(key: string): string {
    const map: Record<string, string> = {
      issues:     'Issues',
      rfis:       'RFIs',
      submittals: 'Submittals',
      clashes:    'Clashes'
    };
    return map[key] ?? key;
  }

  get domainEntries() {
    if (!this.health) return [];
    return this.domainOrder.map(key => {
      const d = this.health!.domains[key as keyof typeof this.health.domains];
      const weightPct = Math.round(d.weight * 100);
      const signals = this.signalsForDomain(key);
      return {
        key,
        label:             this.domainLabel(key),
        resolved:          d.resolved,
        total:             d.total,
        needsAttention:    d.needs_attention,
        isNeutral:         d.neutral,
        avgDaysToClose:    d.avg_days_to_close,
        weight:            weightPct,
        reasonSignals:     signals.filter(s => s.group === 'reason'),
        infoSignals:       signals.filter(s => s.group === 'info')
      };
    });
  }

  get overallTooltip(): string {
    if (!this.health) return '';
    return this.domainEntries
      .filter(e => !e.isNeutral)
      .map(e => `${e.label} ${e.resolved}/${e.total}`)
      .join(' · ');
  }

  toggleDomain(key: string): void {
    this.expandedDomain = this.expandedDomain === key ? null : key;
  }

  signalsForDomain(domain: string): HealthSignal[] {
    if (!this.health) return [];
    return this.health.signals.filter(s => s.domain === domain);
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour:   '2-digit',
      minute: '2-digit'
    });
  }
}