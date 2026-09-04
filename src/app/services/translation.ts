import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';


export interface TranslationStatus {
  urn: string;
  status: string;
  progress: string;
}

export interface ShareResponse {
  url: string;
  token: string;
  expires_at: string;
  file_name: string;
}

export interface ViewerData {
  urn: string;
  token: string;
  file_name: string;
  expires_at: string;
  is_shared?: boolean;
}

export interface Version {
  version_id: string;
  version_urn: string;
  version_number: number;
  name: string;
  file_type: string;
  created_at: string;
  created_by: string;
}

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private apiBaseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  checkStatus(urn: string): Observable<TranslationStatus> {
    return this.http.get<TranslationStatus>(
      `${this.apiBaseUrl}/translate/${urn}/status`,
      { withCredentials: true }
    );
  }

  share(urn: string, fileName: string, expiresInDays: number): Observable<ShareResponse> {
    return this.http.post<ShareResponse>(
      `${this.apiBaseUrl}/share`,
      { urn, file_name: fileName, expires_in_days: expiresInDays },
      { withCredentials: true }
    );
  }

  getViewerData(token: string): Observable<ViewerData> {
    return this.http.get<ViewerData>(`${this.apiBaseUrl}/viewer/${token}`);
  }

  getVersions(projectId: string, itemId: string): Observable<Version[]> {
    return this.http.get<Version[]>(`${this.apiBaseUrl}/projects/${projectId}/items/${itemId}/versions`);
  }

  getAuthViewerData(urn: string, fileName: string): Observable<ViewerData> {
    return this.http.get<ViewerData>(
      `/api/v1/viewer/auth/${urn}`,
      { params: { file_name: fileName }, withCredentials: true }
    );
  }
}
