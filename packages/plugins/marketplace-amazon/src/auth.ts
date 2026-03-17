import { createLogger } from '@forkcart/core';

const logger = createLogger('amazon-auth');

/** Amazon SP-API region endpoints */
const REGION_ENDPOINTS: Record<string, string> = {
  NA: 'https://sellingpartnerapi-na.amazon.com',
  EU: 'https://sellingpartnerapi-eu.amazon.com',
  FE: 'https://sellingpartnerapi-fe.amazon.com',
};

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class AmazonAuth {
  private clientId = '';
  private clientSecret = '';
  private refreshToken = '';
  private region = 'EU';
  private tokenCache: TokenCache | null = null;

  configure(settings: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    region?: string;
  }): void {
    this.clientId = settings.clientId;
    this.clientSecret = settings.clientSecret;
    this.refreshToken = settings.refreshToken;
    this.region = settings.region ?? 'EU';
    this.tokenCache = null;
  }

  get baseUrl(): string {
    return REGION_ENDPOINTS[this.region] ?? 'https://sellingpartnerapi-eu.amazon.com';
  }

  /** Get a valid access token, refreshing if needed */
  async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60_000) {
      return this.tokenCache.accessToken;
    }

    logger.debug('Refreshing Amazon LWA access token');

    const res = await fetch(LWA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Amazon LWA token refresh failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    logger.debug('Amazon LWA access token refreshed');
    return this.tokenCache.accessToken;
  }

  /** Make an authenticated request to SP-API */
  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-amz-access-token': token,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Amazon SP-API ${method} ${path} failed (${res.status}): ${text}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}
