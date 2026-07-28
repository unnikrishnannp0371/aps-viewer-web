// src/app/services/issues.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface IssuePushpin {
  location:      { x: number; y: number; z: number } | null;
  objectId:      number | null;
  viewable_guid: string | null;
  seed_urn:      string | null;
}

export interface Issue {
  id:             string;
  title:          string;
  display_id:     string;
  created_by_name: string;
  status:         string;
  issue_type:     string;
  issue_sub_type: string;
  assigned_to:    string;
  due_date:       string;
  created_at:     string;
  updated_at:     string;
  created_by:     string;
  location:       string;
  description:    string;
  closed_at:      string
  pushpin:        IssuePushpin | null;
  viewable_id:    string | null;
  external_id:    string;
  risk_level:     RiskLevel;       // ← new: computed by Rails
}

export interface IssuesByStatus {
  draft:     number;
  open:      number;
  pending:   number;
  in_review: number;
  closed:    number;
  [key: string]: number;  // ← add this
}

// ← new: mirrors RfiAttention shape
export interface IssueAttention {
  overdue:        number;  // open/active + past due date
  unassigned:     number;  // open/active + no assignee
  stale:          number;  // open/active + created >30 days ago
  avg_resolution: number | null; // avg days created→updated for closed issues
}

export interface IssuesSummary {
  total:       number;
  offset:      number;
  limit:       number;
  by_status:   IssuesByStatus;
  by_type:     Record<string, number>;
  by_assignee: Record<string, number>;
  attention:   IssueAttention;   // ← new
  recent_open: Issue[];
  issues:      Issue[];
}

export interface IssueFilters {
  status?:      string;
  type?:        string;
  assigned_to?: string;
}

@Injectable({ providedIn: 'root' })
export class IssuesService {
  private apiBaseUrl = '/api/v1';
  private summaryCache = new Map<string, Pick<IssuesSummary, 'by_status' | 'by_type' | 'by_assignee' | 'attention'>>();

  constructor(private http: HttpClient) {}

  clearCache(projectId: string): void {
    this.summaryCache.delete(projectId);
  }

  getIssuesSummary(
    hubId:     string,
    projectId: string,
    filters:   IssueFilters = {},
    limit:     number = 20,
    offset:    number = 0
  ): Observable<IssuesSummary> {
    let params = new HttpParams()
      .set('hub_id', hubId)
      .set('limit',  limit)
      .set('offset', offset);

    if (filters.status)      params = params.set('status',      filters.status);
    if (filters.type)        params = params.set('type',        filters.type);
    if (filters.assigned_to) params = params.set('assigned_to', filters.assigned_to);

    return this.http.get<IssuesSummary>(
      `${this.apiBaseUrl}/projects/${projectId}/issues`,
      { withCredentials: true, params }
    ).pipe(
      tap(data => {
        const isUnfiltered = !filters.status && !filters.type && !filters.assigned_to;
        if (isUnfiltered) {
          this.summaryCache.set(projectId, {
            by_status:   data.by_status,
            by_type:     data.by_type,
            by_assignee: data.by_assignee,
            attention:   data.attention
          });
        }
      })
    );
  }

  getCachedSummary(projectId: string) {
    return this.summaryCache.get(projectId) ?? null;
  }
}