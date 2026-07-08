import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Fetches the project health score from Rails.
// The health endpoint aggregates signals across all ACC domains
// and returns a single score + breakdown.

export interface DomainScore {
  score: number;
  weight: number;
}

export interface HealthSignal {
  key: string;
  label: string;
  value: number;
  severity: 'good' | 'warning' | 'critical';
  domain: 'issues' | 'rfis' | 'submittals' | 'clashes';
}

export interface ProjectHealth {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  domain_scores: {
    issues: DomainScore;
    rfis: DomainScore;
    submittals: DomainScore;
    clashes: DomainScore;
  };
  signals: HealthSignal[];
  calculated_at: string;
  data_available: boolean;
  totals: { issues: number; rfis: number; submittals: number; clashes: number; };
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
