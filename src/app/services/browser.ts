import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Hub {
  id: string;
  name: string;
  type: string;
}

export interface Project {
  project_id: string;
  hub_id: string;
  name: string;
  type: string;
}

export interface Folder {
  folder_id: string;
  project_id: string;
  content_id?: string;
  name: string;
  type: string;
}

export interface FolderItem {
  content_id: string;
  folder_id: string;
  name: string;
  type: string;
}

export interface BreadcrumbItem {
  label: string,
  level: 'root' | 'hub' | 'project' | 'folder';
  id: string;
  extra?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BrowserService {
  private apiBaseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  getHubs(): Observable<Hub[]>{
    return this.http.get<Hub[]>(`${this.apiBaseUrl}/hubs`,{
      withCredentials: true
    });
  }

  getProjects(hubId: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiBaseUrl}/hubs/${hubId}/projects`,{
      withCredentials: true
    })
  }

  getFolders(hubId: string, projectId: string): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.apiBaseUrl}/hubs/${hubId}/projects/${projectId}/folders`, {
      withCredentials: true
    })
  }

  getFolderContents(projectId: string, folderId: string): Observable<FolderItem[]> {
    return this.http.get<FolderItem[]>(`${this.apiBaseUrl}/projects/${projectId}/folders/${folderId}/contents`, {
      withCredentials: true
    })
  }
}
