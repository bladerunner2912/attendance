import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { APP_CONFIG } from '../config/app-config';
@Injectable({
  providedIn: 'root',
})
export class Auth {

  private baseUrl = `${APP_CONFIG.apiBaseUrl}/auth`;
  private readonly platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) { }

  private get storage(): Storage | null {
    return isPlatformBrowser(this.platformId) ? window.localStorage : null;
  }

  private setSession(res: { accessToken?: string; role?: string; user?: unknown; [key: string]: any }) {
    if (res?.accessToken) {
      this.storage?.setItem('accessToken', res.accessToken);
    }
    if (res?.role) {
      this.storage?.setItem('role', res.role);
    }
    if (!res || typeof res !== 'object') {
      return;
    }

    const anyRes = res as Record<string, unknown>;
    const userPayload =
      (anyRes['user'] as Record<string, unknown>) ??
      (anyRes['userInfo'] as Record<string, unknown>) ??
      (anyRes['profile'] as Record<string, unknown>) ??
      (anyRes['user_id'] || anyRes['userId'] || anyRes['id'] || anyRes['email'] ? anyRes : null);

    if (userPayload) {
      const { accessToken, role, ...rest } = userPayload as Record<string, unknown>;
      this.storage?.setItem(
        'user',
        JSON.stringify({ ...rest, role: (role as string | undefined) ?? res?.role })
      );
    }
  }

  login(data: { email: string; password: string }) {
    return this.http.post<any>(`${this.baseUrl}/login`, data).pipe(
      tap((res) => {
        this.setSession(res);
      })
    );
  }

  register(data: { email: string; password: string; role: string }) {
    return this.http.post<any>(`${this.baseUrl}/register`, data).pipe(
      tap((res) => {
        this.setSession(res);
      })
    );
  }

  logout() {
    this.storage?.removeItem('accessToken');
    this.storage?.removeItem('role');
    this.storage?.removeItem('user');
  }

  getToken() {
    const token = this.storage?.getItem('accessToken') ?? null;
    if (!token) {
      return null;
    }
    if (this.isTokenExpired(token)) {
      this.logout();
      return null;
    }
    return token;
  }

  getRole() {
    return this.storage?.getItem('role') ?? null;
  }

  getUser<T = any>() {
    const raw = this.storage?.getItem('user') ?? null;
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.storage?.removeItem('user');
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payloadSegment = token.split('.')[1];
      if (!payloadSegment) {
        return false;
      }
      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const decoded = atob(padded);
      const payload = JSON.parse(decoded) as { exp?: number };
      if (!payload?.exp || typeof payload.exp !== 'number') {
        return false;
      }
      const nowSeconds = Math.floor(Date.now() / 1000);
      return payload.exp <= nowSeconds;
    } catch {
      return false;
    }
  }
}
