import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface Submittal {
  id:                    string;
  submittal_number:      string | null;
  title:                 string;
  description:           string | null;
  status:                string;
  status_id:             string;
  priority:              string | null;
  revision:              number;
  spec_title:            string | null;
  spec_identifier:       string | null;
  subsection:            string | null;
  package_title:         string | null;
  ball_in_court:         string[];
  manager:               string | null;
  subcontractor:         string | null;
  effective_due_date:    string | null;
  due_date:              string | null;
  submitter_due_date:    string | null;
  required_on_job:       string | null;
  sent_to_review:        string | null;
  received_from_review:  string | null;
  published_date:        string | null;
  created_at:            string;
  updated_at:            string;
  created_by:            string;
  risk_level:            RiskLevel;
}

export interface SubmittalsByStatus {
  required: number;
  open:     number;
  closed:   number;
  void:     number;
  empty:    number;
  draft:    number;
  total:    number;
  [key: string]: number;
}

export interface SubmittalAttention {
  overdue:           number;
  awaiting_review:  number;
  high_priority:     number;
  avg_review_days: number | null;
}

export interface SubmittalSummary {
  submittals: Submittal[];
  total:     number;
  offset:    number;
  limit:     number;
  by_status: SubmittalsByStatus;
  attention: SubmittalAttention;
}

export interface SubmittalFilters {
  status_id?: string;
  spec_id?:  string;
}

@Injectable({
  providedIn: 'root',
})
export class SubmittalsService {
  private apiBaseUrl = '/api/v1';
  private summaryCache = new Map<string, Pick<SubmittalSummary, 'by_status' | 'attention'>>();

  constructor(private http: HttpClient) {}

  clearCache(projectId: string): void {
    this.summaryCache.delete(projectId);
  }

  getCachedSummary(projectId: string) {
    return this.summaryCache.get(projectId) ?? null;
  }

  getSubmittalsSummary(
    projectId: string,
    filters: SubmittalFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Observable<SubmittalSummary> {
    let params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);

    if (filters.status_id) params = params.set('status_id', filters.status_id);
    if (filters.spec_id)   params = params.set('spec_id',   filters.spec_id);

    return this.http.get<SubmittalSummary>(
      `${this.apiBaseUrl}/projects/${projectId}/submittals`,
      { withCredentials: true, params }
    ).pipe(
      tap(data => {
        const isUnfiltered = !filters.status_id && !filters.spec_id;
        if (isUnfiltered) {
          this.summaryCache.set(projectId, {
            by_status: data.by_status,
            attention: data.attention
          });
        }
      })
    );
  }
}
