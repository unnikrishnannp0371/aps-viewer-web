// src/app/services/rfi.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
  [key: string]: number;  // ← add this
}

export interface RfiAttention {
  overdue:           number;
  high_priority:     number;
  cost_or_schedule:  number;
  avg_response_days: number | null;
}

export interface RfiSummary {
  rfis:      Rfi[];
  total:     number;
  offset:    number;
  limit:     number;
  by_status: RfisByStatus;
  attention: RfiAttention;
}

export interface RfiFilters {
  status?: string;
  title?:  string;
}

@Injectable({ providedIn: 'root' })
export class RfiService {
  private apiBaseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

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

    if (filters.status) params = params.set('status', filters.status);
    if (filters.title)  params = params.set('title',  filters.title);

    return this.http.get<RfiSummary>(
      `${this.apiBaseUrl}/projects/${projectId}/rfis`,
      { withCredentials: true, params }
    );
  }
}