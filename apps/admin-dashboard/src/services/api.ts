const API_BASE = '/api/v1';

export class AdminApiClient {
  static getAccessToken(): string | null {
    return localStorage.getItem('nearwork_admin_access_token');
  }

  static setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('nearwork_admin_access_token', accessToken);
    localStorage.setItem('nearwork_admin_refresh_token', refreshToken);
  }

  static clearTokens() {
    localStorage.removeItem('nearwork_admin_access_token');
    localStorage.removeItem('nearwork_admin_refresh_token');
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
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, message: 'Invalid response from server' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Connection timed out' };
      }
      return { success: false, message: 'Could not connect to backend server' };
    }
  }
}
