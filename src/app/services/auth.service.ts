import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

export interface AuthUser {
  token: string;
  bystanderId: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  occupation?: string;
  company?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

 constructor(private http: HttpClient, private router: Router) {
  const stored = localStorage.getItem('auth');

  if (stored) {
    const savedUser: AuthUser = JSON.parse(stored);
    this.currentUserSubject.next(savedUser);

    // ✅ Delay refresh to next tick to prevent circular DI
    Promise.resolve().then(() => {
      this.refreshUserProfile(savedUser.token);
    });
  }
}

  /** Sign up */
  signup(data: any) {
    return this.http
      .post<any>(`${environment.api_url}api/bystanders/signup`, data)
      .pipe(
        tap((res) => {
          if (res.token) this.setSession(res);
        })
      );
  }

  /** Login */
  login(email: string, password: string) {
    return this.http
      .post<any>(`${environment.api_url}api/bystanders/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.token) this.setSession(res);
        })
      );
  }

  /** Get current user profile */
  fetchProfile() {
    return this.http.get<any>(`${environment.api_url}api/bystanders/profile`);
  }

  /** Refresh stored user with server data (auto on startup) */
  private refreshUserProfile(token: string) {
    this.http
      .get<any>(`${environment.api_url}api/bystanders/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (data) => {
          const updatedUser: AuthUser = {
            ...data,
            token,
            bystanderId: data.bystanderId || data.user?.bystanderId,
          };

          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('auth', JSON.stringify(updatedUser));
        },
        error: (err) => {
          console.warn('Failed to auto-refresh user profile:', err);
          if (err.status === 401) this.logout();
        },
      });
  }

  /** Logout */
  logout() {
    localStorage.removeItem('auth');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /** Save session after signup/login */
  private setSession(res: any) {
    const user: AuthUser = {
      token: res.token,
      bystanderId: res.bystanderId,
      username: res.username,
      email: res.email,
      // backend may not return full profile on login, so fill later via refresh
    };

    localStorage.setItem('auth', JSON.stringify(user));
    this.currentUserSubject.next(user);

    // Immediately refresh full profile
    this.refreshUserProfile(res.token);
  }

  /** Get JWT token */
  get token(): string | null {
    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored).token : null;
  }

  /** Check authentication */
  get isAuthenticated(): boolean {
    return !!this.token;
  }

  /** Get current full user object */
  getUser(): AuthUser | null {
    const user = this.currentUserSubject.value;
    if (user) return user;

    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored) : null;
  }

  /** Alias for token */
  getToken(): string | null {
    return this.token;
  }
}
