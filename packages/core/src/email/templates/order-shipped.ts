import { baseLayout } from './base';

export interface OrderShippedData {
  orderNumber: string;
  customerName: string;
  trackingUrl?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

export function orderShippedHtml(data: OrderShippedData): string {
  const trackingSection = data.trackingUrl
    ? `
    <p>Du kannst dein Paket hier verfolgen:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${data.trackingUrl}" class="btn">📦 Sendung verfolgen</a>
    </p>
    ${data.trackingNumber ? `<p style="font-size:13px;color:#6b7280;text-align:center;">Sendungsnummer: ${data.trackingNumber}</p>` : ''}
    ${data.carrier ? `<p style="font-size:13px;color:#6b7280;text-align:center;">Versanddienstleister: ${data.carrier}</p>` : ''}
    `
    : data.trackingNumber
      ? `
    <div class="address-block" style="text-align:center;">
      <p style="font-weight:600;">Sendungsnummer: ${data.trackingNumber}</p>
      ${data.carrier ? `<p>Versanddienstleister: ${data.carrier}</p>` : ''}
    </div>
    `
      : `<p>Sobald Tracking-Informationen verfügbar sind, erhältst du eine weitere Benachrichtigung.</p>`;

  const content = `
    <h1>Deine Bestellung ist unterwegs! 🚀</h1>
    <p>Hallo ${data.customerName},</p>
    <p>gute Nachrichten — deine Bestellung <strong>${data.orderNumber}</strong> wurde versendet!</p>

    ${trackingSection}

    ${data.estimatedDelivery ? `<p style="margin-top:16px;">Voraussichtliche Lieferung: <strong>${data.estimatedDelivery}</strong></p>` : ''}

    <hr class="divider">
    <p>Bei Fragen zu deiner Lieferung antworte einfach auf diese E-Mail.</p>
  `;

  return baseLayout(content, `Deine Bestellung ${data.orderNumber} wurde versendet`);
}

export function orderShippedText(data: OrderShippedData): string {
  const lines = [
    'VERSANDBENACHRICHTIGUNG',
    '',
    `Hallo ${data.customerName},`,
    '',
    `deine Bestellung ${data.orderNumber} wurde versendet!`,
    '',
  ];

  if (data.trackingUrl) {
    lines.push(`Sendung verfolgen: ${data.trackingUrl}`);
  }
  if (data.trackingNumber) {
    lines.push(`Sendungsnummer: ${data.trackingNumber}`);
  }
  if (data.carrier) {
    lines.push(`Versanddienstleister: ${data.carrier}`);
  }
  if (data.estimatedDelivery) {
    lines.push(`Voraussichtliche Lieferung: ${data.estimatedDelivery}`);
  }

  lines.push('', 'Bei Fragen antworte einfach auf diese E-Mail.', '', '— ForkCart');

  return lines.join('\n');
}
