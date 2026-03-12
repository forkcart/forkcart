import { baseLayout } from './base';

export interface PasswordResetData {
  customerName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function passwordResetHtml(data: PasswordResetData): string {
  const expiry = data.expiresInMinutes ?? 60;

  const content = `
    <h1>Passwort zurücksetzen</h1>
    <p>Hallo ${data.customerName},</p>
    <p>wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Klicke auf den Button, um ein neues Passwort zu erstellen:</p>

    <p style="text-align:center;margin:28px 0;">
      <a href="${data.resetUrl}" class="btn">🔑 Neues Passwort erstellen</a>
    </p>

    <p style="font-size:13px;color:#6b7280;">Dieser Link ist ${expiry} Minuten gültig.</p>

    <hr class="divider">
    <p style="font-size:13px;color:#6b7280;">Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort wird nicht geändert.</p>
  `;

  return baseLayout(content, 'Passwort zurücksetzen');
}

export function passwordResetText(data: PasswordResetData): string {
  const expiry = data.expiresInMinutes ?? 60;

  return `PASSWORT ZURÜCKSETZEN

Hallo ${data.customerName},

wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten.

Klicke auf den folgenden Link, um ein neues Passwort zu erstellen:
${data.resetUrl}

Dieser Link ist ${expiry} Minuten gültig.

Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.

— ForkCart`;
}
