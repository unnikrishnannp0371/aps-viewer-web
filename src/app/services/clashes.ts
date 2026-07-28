// src/app/services/clashes.ts

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

// ── API shapes (verified against bim360/modelset + bim360/clash endpoints) ──

export interface ClashModelSet {
  modelSetId:   string;
  name:         string;
  isDisabled:   boolean;
  isDeleted:    boolean;
  createdTime:  string;
}

export interface ClashStatusCounts {
  new:      number;  // status = 1
  assigned: number;  // status = 2
  closed:   number;  // status = 3
}

export interface ClashModelSetSummary {
  modelSetId:  string;
  name:        string;
  total:       number;
  by_status:   ClashStatusCounts;
  lastTestedOn: string | null;
}

export interface ClashesSummary {
  total:      number;
  by_status:  ClashStatusCounts;
  modelsets:  ClashModelSetSummary[];
}

@Injectable({ providedIn: 'root' })
export class ClashesService {
  private apiBaseUrl = '/api/v1';
  private summaryCache = new Map<string, ClashesSummary>();

  constructor(private http: HttpClient) {}

  clearCache(projectId: string): void {
    this.summaryCache.delete(projectId);
  }

  getClashesSummary(
    hubId:     string,
    projectId: string
  ): Observable<ClashesSummary> {
    return this.http.get<ClashesSummary>(
      `${this.apiBaseUrl}/projects/${projectId}/clashes/summary`,
      { withCredentials: true, params: { hub_id: hubId } }
    ).pipe(
      tap(data => this.summaryCache.set(projectId, data))
    );
  }

  getCachedSummary(projectId: string): ClashesSummary | null {
    return this.summaryCache.get(projectId) ?? null;
  }
}