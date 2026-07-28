// src/app/services/rfi.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface Rfi {
  id:                string;
  rfi_number:        string | null;
  subject:           string;
  status:            string;
  due_date:          string | null;
  created_at:        string;
  updated_at:        string;
  assigned_to:       string | null;
  created_by:        string;
  official_response: string | null;
  question:          string | null;
  priority:          string | null;
  cost_impact:       string | null;
  schedule_impact:   string | null;
  discipline:        string[];
  category:          string[];
  risk_level:        RiskLevel;
}

export interface RfisByStatus {
  open:      number;
  submitted: number;
  answered:  number;
  closed:    number;
  total:     number;
  [key: string]: number;
}

export interface RfiAttention {
  overdue:           number;
  high_priority:     number;
  cost_or_schedule:  number;
  avg_response_days: number | null;
}

export interface RfiSummary {
  rfis:          Rfi[];
  total:         number;
  offset:        number;
  limit:         number;
  by_status:     RfisByStatus;
  by_discipline: Record<string, number>;
  by_assignee:   Record<string, number>;
  attention:     RfiAttention;
}

export interface RfiFilters {
  status?:      string;
  title?:       string;
  discipline?:  string;
  assigned_to?: string;
}

@Injectable({ providedIn: 'root' })
export class RfiService {
  private apiBaseUrl = '/api/v1';
  private summaryCache = new Map<string, Pick<RfiSummary, 'by_status' | 'by_discipline' | 'by_assignee' | 'attention'>>();

  constructor(private http: HttpClient) {}

  clearCache(projectId: string): void {
    this.summaryCache.delete(projectId);
  }

  getCachedSummary(projectId: string) {
    return this.summaryCache.get(projectId) ?? null;
  }

  getRfisSummary(
    hubId:     string,
    projectId: string,
    filters:   RfiFilters = {},
    limit:     number = 20,
    offset:    number = 0
  ): Observable<RfiSummary> {
    let params = new HttpParams()
      .set('hub_id', hubId)
      .set('limit',  limit)
      .set('offset', offset);

    if (filters.status)      params = params.set('status',      filters.status);
    if (filters.title)       params = params.set('title',       filters.title);
    if (filters.discipline)  params = params.set('discipline',  filters.discipline);
    if (filters.assigned_to) params = params.set('assigned_to', filters.assigned_to);

    return this.http.get<RfiSummary>(
      `${this.apiBaseUrl}/projects/${projectId}/rfis`,
      { withCredentials: true, params }
    ).pipe(
      tap(data => {
        const isUnfiltered = !filters.status && !filters.title && !filters.discipline && !filters.assigned_to;
        if (isUnfiltered) {
          this.summaryCache.set(projectId, {
            by_status:     data.by_status,
            by_discipline: data.by_discipline,
            by_assignee:   data.by_assignee,
            attention:     data.attention
          });
        }
      })
    );
  }
}