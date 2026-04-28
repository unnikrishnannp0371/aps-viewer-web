import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface User {
  name: string;
  email: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiBaseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  checkStatus(): Observable<AuthStatus> {
    return this.http.get<AuthStatus>(`${this.apiBaseUrl}/auth/status`, 
      { withCredentials: true }
    );
  }

  login(): void {
    window.location.href = `${this.apiBaseUrl}/auth/login`;
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/auth/logout`, {}, 
      { withCredentials: true }
    );
  }
}

// export class Auth {}
