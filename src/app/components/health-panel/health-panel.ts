// Project Health Score panel.
// Shows a single score (0-100), grade, label, domain breakdown,
// and individual signals with severity indicators.
//
// Unique value vs Insights/PowerBI:
//   - Single live score updated on every dashboard load
//   - Cross-domain weighted formula (not just one API)
//   - Extensible — RFI, Submittal, Clash scores plug in automatically
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { HealthService, HealthSignal, ProjectHealth } from '../../services/health';

@Component({
  standalone: true,
  selector: 'app-health-panel',
  imports: [CommonModule],
  templateUrl: './health-panel.html',
  styleUrl: './health-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class HealthPanel implements OnInit, OnChanges {
  @Input() hubId!: string;
  @Input() projectId!: string;

  health: ProjectHealth | null = null;
  isLoading = false;
  error: string | null = null;

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

  loadHealth(): void {
    this.isLoading = true;
    this.error = null;

    this.healthService.getHealth(this.hubId, this.projectId).subscribe({
      next: data => {
        this.health = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Failed to load health score.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }
  // ── Template Helpers ───────────────────────────────────────────────────────

  // Colour of the score ring and grade badge — driven by grade
  gradeColor(grade: string): string {
    const map: Record<string, string> = {
      A: '#38a169',  // green
      B: '#68d391',  // light green
      C: '#dd6b20',  // orange
      D: '#e53e3e',  // red
      F: '#742a2a'   // dark red
    };
    return map[grade] ?? '#9ca3af'; // default gray
  }

  // severity indicator for each signal — driven by severity
  severityColor(severity: HealthSignal['severity']): string {
    const map = {
      good:     '#38a169',
      warning:  '#dd6b20',
      critical: '#e53e3e'
    };
    return map[severity];
  }
  // Domain score bar width as a percentage string
  domainWidth(score: number): string {
    return `${score}%`;
  }

  // Domain score colour — same logic as grade but driven by raw score
  domainColor(score: number): string {
    if (score >= 85) return '#38a169';
    if (score >= 70) return '#68d391';
    if (score >= 55) return '#dd6b20';
    if (score >= 40) return '#e53e3e';
    return '#742a2a';
  }

  // Human readable domain names
  domainLabel(key: string): string {
    const map: Record<string, string> = {
      issues:     'Issues',
      rfis:       'RFIs',
      submittals: 'Submittals',
      clashes:    'Clashes'
    };
    return map[key] ?? key;
  }

  // Domain entries as array so template can iterate
  get domainEntries() {
    if (!this.health) return [];
    return Object.entries(this.health.domain_scores).map(([key, ds]) => ({
      key,
      label:  this.domainLabel(key),
      score:  ds.score,
      weight: Math.round(ds.weight * 100)
    }));
  }

  // Format the calculated_at timestamp
  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour:   '2-digit',
      minute: '2-digit'
    });
  }
}

