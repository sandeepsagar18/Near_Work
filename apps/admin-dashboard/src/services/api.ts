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

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    return response.json();
  }
}
