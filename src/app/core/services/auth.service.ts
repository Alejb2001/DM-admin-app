import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, RegisterResponse, User } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _currentUser = signal<User | null>(null);
  private _pendingVerificationEmail = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly pendingVerificationEmail = this._pendingVerificationEmail.asReadonly();

  constructor() {
    const token = this.getAccessToken();
    if (token) {
      this.loadCurrentUser();
    }
  }

  register(data: RegisterRequest) {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap(res => this._pendingVerificationEmail.set(res.email))
    );
  }

  login(data: LoginRequest) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, data).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  verifyEmail(token: string) {
    return this.http.get<AuthResponse>(`${environment.apiUrl}/auth/verify-email`, {
      params: { token },
    }).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  resendVerification(email: string) {
    return this.http.post(`${environment.apiUrl}/auth/resend-verification`, { email });
  }

  refresh() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  logout() {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession()
    });
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private handleAuthResponse(res: AuthResponse) {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    this._currentUser.set(res.user);
  }

  private loadCurrentUser() {
    this.http.get<User>(`${environment.apiUrl}/auth/me`).subscribe({
      next: user => this._currentUser.set(user),
      error: () => this.clearSession()
    });
  }

  private clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this._currentUser.set(null);
  }
}
