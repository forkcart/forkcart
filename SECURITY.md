# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ Yes    |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email us at **security@forkcart.com**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge your report within 48 hours and provide a detailed response within 7 days.

## Security Features

ForkCart includes the following security measures:

- **CSRF Protection** — Double-Submit Cookie pattern
- **Rate Limiting** — Sliding window, per-bucket and per-API-key
- **Input Validation** — Zod schemas on all endpoints
- **SQL Injection Prevention** — Drizzle ORM (parameterized queries only)
- **XSS Protection** — Secure headers via Hono
- **Encryption** — AES-256-GCM for sensitive plugin settings
- **Authentication** — JWT with bcrypt password hashing
- **CORS** — Configurable allowed origins
- **Body Size Limits** — Prevents denial of service
- **Session Secret Validation** — Rejects weak/default secrets at startup
- **Docker Security** — All internal ports bound to 127.0.0.1

## Responsible Disclosure

We believe in responsible disclosure. Security researchers who report vulnerabilities responsibly will be credited (with permission) in our release notes.
