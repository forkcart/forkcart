import { createHmac, createHash } from 'node:crypto';

const KAUFLAND_BASE_URL = 'https://sellerapi.kaufland.de/v2';

export class KauflandAuth {
  private clientKey = '';
  private secretKey = '';

  configure(settings: { clientKey: string; secretKey: string }): void {
    this.clientKey = settings.clientKey;
    this.secretKey = settings.secretKey;
  }

  get baseUrl(): string {
    return KAUFLAND_BASE_URL;
  }

  /**
   * Generate HMAC signature for Kaufland API.
   * Signature = HMAC-SHA256(secretKey, method + url + body + timestamp)
   */
  private sign(method: string, url: string, body: string, timestamp: string): string {
    const bodyHash = createHash('sha256').update(body).digest('hex');
    const signatureInput = `${method}\n${url}\n${bodyHash}\n${timestamp}`;
    return createHmac('sha256', this.secretKey).update(signatureInput).digest('hex');
  }

  /** Make an authenticated request to Kaufland Seller API */
  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    let url = `${KAUFLAND_BASE_URL}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = body ? JSON.stringify(body) : '';
    const signature = this.sign(method.toUpperCase(), url, bodyStr, timestamp);

    const headers: Record<string, string> = {
      'Shop-Client-Key': this.clientKey,
      'Shop-Timestamp': timestamp,
      'Shop-Signature': signature,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr || undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kaufland API ${method} ${path} failed (${res.status}): ${text}`);
    }

    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return undefined as T;
  }
}
