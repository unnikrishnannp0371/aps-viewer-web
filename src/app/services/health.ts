import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Fetches project health from Rails.
// Each domain reports resolved/total counts (a union "needs_attention",
// not a sum of individual flags) plus a 0-100 score used only to compute
// the overall weighted score/grade.

export interface DomainHealth {
  total:              number;
  needs_attention:    number;
  resolved:           number;
  score:              number;
  weight:             number;
  neutral:            boolean;
  avg_days_to_close:  number | null;
}

export interface HealthSignal {
  key: string;
  label: string;
  value: number;
  severity: 'good' | 'warning' | 'critical';
  domain: 'issues' | 'rfis' | 'submittals' | 'clashes';
  group: 'reason' | 'info';
}

export interface ProjectHealth {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  domains: {
    issues: DomainHealth;
    rfis: DomainHealth;
    submittals: DomainHealth;
    clashes: DomainHealth;
  };
  signals: HealthSignal[];
  calculated_at: string;
  data_available: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private readonly base = '/api/v1';

  constructor(private http: HttpClient) {}

  // Fetches health score for a project.
  // hub_id is required because the Rails controller needs it
  // to resolve the issue container ID.
  getHealth(hubId: string, projectId: string): Observable<ProjectHealth> {
    return this.http.get<ProjectHealth>(
      `${this.base}/projects/${projectId}/health`,
      {
        params: { hub_id: hubId},
        withCredentials: true
      }
    );
  }
}
