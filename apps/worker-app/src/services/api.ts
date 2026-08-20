const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://nearwork-api.vercel.app/api/v1'
    : '/api/v1');

export class WorkerApiClient {
  static getAccessToken(): string | null {
    return localStorage.getItem('nearwork_worker_access_token');
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem('nearwork_worker_refresh_token');
  }

  static setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('nearwork_worker_access_token', accessToken);
    localStorage.setItem('nearwork_worker_refresh_token', refreshToken);
  }

  static clearTokens() {
    localStorage.removeItem('nearwork_worker_access_token');
    localStorage.removeItem('nearwork_worker_refresh_token');
  }

  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; message?: string; errors?: any }> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 401 && this.getRefreshToken()) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
          response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
          });
        }
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, message: 'Invalid server response' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Connection timed out. Server is taking too long to respond.' };
      }
      return { success: false, message: 'Could not connect to NearWork backend server.' };
    }
  }

  static async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
    } catch (e) {}

    this.clearTokens();
    return false;
  }
}
