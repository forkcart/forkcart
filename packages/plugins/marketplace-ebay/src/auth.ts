import { createLogger } from '@forkcart/core';

const logger = createLogger('ebay-auth');

const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SANDBOX_TOKEN_URL = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class EbayAuth {
  private clientId = '';
  private clientSecret = '';
  private refreshToken = '';
  private sandbox = false;
  private tokenCache: TokenCache | null = null;

  configure(settings: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    sandbox?: boolean;
  }): void {
    this.clientId = settings.clientId;
    this.clientSecret = settings.clientSecret;
    this.refreshToken = settings.refreshToken;
    this.sandbox = settings.sandbox ?? false;
    this.tokenCache = null;
  }

  get baseUrl(): string {
    return this.sandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  }

  /** Get a valid access token, refreshing if needed */
  async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60_000) {
      return this.tokenCache.accessToken;
    }

    logger.debug('Refreshing eBay access token');

    const tokenUrl = this.sandbox ? EBAY_SANDBOX_TOKEN_URL : EBAY_TOKEN_URL;
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        scope:
          'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.account',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`eBay token refresh failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    logger.debug('eBay access token refreshed');
    return this.tokenCache.accessToken;
  }

  /** Make an authenticated request to eBay REST API */
  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`eBay API ${method} ${path} failed (${res.status}): ${text}`);
    }

    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return undefined as T;
  }
}
