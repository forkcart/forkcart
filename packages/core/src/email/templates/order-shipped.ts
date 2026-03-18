import { baseLayout } from './base';
import { escapeHtml } from './escape-html';

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
    <p>You can track your package here:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${escapeHtml(data.trackingUrl)}" class="btn">📦 Track Shipment</a>
    </p>
    ${data.trackingNumber ? `<p style="font-size:13px;color:#6b7280;text-align:center;">Tracking number: ${escapeHtml(data.trackingNumber)}</p>` : ''}
    ${data.carrier ? `<p style="font-size:13px;color:#6b7280;text-align:center;">Carrier: ${escapeHtml(data.carrier)}</p>` : ''}
    `
    : data.trackingNumber
      ? `
    <div class="address-block" style="text-align:center;">
      <p style="font-weight:600;">Tracking number: ${escapeHtml(data.trackingNumber)}</p>
      ${data.carrier ? `<p>Carrier: ${escapeHtml(data.carrier)}</p>` : ''}
    </div>
    `
      : `<p>Once tracking information is available, you will receive another notification.</p>`;

  const content = `
    <h1>Your Order Is On Its Way! 🚀</h1>
    <p>Hi ${escapeHtml(data.customerName)},</p>
    <p>Great news — your order <strong>${escapeHtml(data.orderNumber)}</strong> has been shipped!</p>

    ${trackingSection}

    ${data.estimatedDelivery ? `<p style="margin-top:16px;">Estimated delivery: <strong>${escapeHtml(data.estimatedDelivery)}</strong></p>` : ''}

    <hr class="divider">
    <p>If you have any questions about your delivery, simply reply to this email.</p>
  `;

  return baseLayout(content, `Your order ${data.orderNumber} has been shipped`);
}

export function orderShippedText(data: OrderShippedData): string {
  const lines = [
    'SHIPPING NOTIFICATION',
    '',
    `Hi ${data.customerName},`,
    '',
    `Your order ${data.orderNumber} has been shipped!`,
    '',
  ];

  if (data.trackingUrl) {
    lines.push(`Track shipment: ${data.trackingUrl}`);
  }
  if (data.trackingNumber) {
    lines.push(`Tracking number: ${data.trackingNumber}`);
  }
  if (data.carrier) {
    lines.push(`Carrier: ${data.carrier}`);
  }
  if (data.estimatedDelivery) {
    lines.push(`Estimated delivery: ${data.estimatedDelivery}`);
  }

  lines.push('', 'If you have any questions, simply reply to this email.', '', '— ForkCart');

  return lines.join('\n');
}
