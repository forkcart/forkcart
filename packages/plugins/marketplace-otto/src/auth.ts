import { createLogger } from '@forkcart/core';

const logger = createLogger('otto-auth');

const OTTO_TOKEN_URL = 'https://api.otto.market/v1/token';
const OTTO_BASE_URL = 'https://api.otto.market';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class OttoAuth {
  private clientId = '';
  private clientSecret = '';
  private tokenCache: TokenCache | null = null;

  configure(settings: { clientId: string; clientSecret: string }): void {
    this.clientId = settings.clientId;
    this.clientSecret = settings.clientSecret;
    this.tokenCache = null;
  }

  get baseUrl(): string {
    return OTTO_BASE_URL;
  }

  /** Get a valid access token using client_credentials grant */
  async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60_000) {
      return this.tokenCache.accessToken;
    }

    logger.debug('Requesting Otto Market access token');

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const res = await fetch(OTTO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Otto Market token request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    logger.debug('Otto Market access token acquired');
    return this.tokenCache.accessToken;
  }

  /** Make an authenticated request to Otto Market API */
  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Otto Market API ${method} ${path} failed (${res.status}): ${text}`);
    }

    if (res.status === 204 || res.status === 202) return undefined as T;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return undefined as T;
  }
}
