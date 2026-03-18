import { baseLayout } from './base';
import { escapeHtml } from './escape-html';

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number; // cents
    totalPrice: number; // cents
  }>;
  subtotal: number; // cents
  shippingTotal: number; // cents
  taxTotal: number; // cents
  total: number; // cents
  currency: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function formatAddress(addr: OrderConfirmationData['shippingAddress']): string {
  const lines = [
    `${escapeHtml(addr.firstName)} ${escapeHtml(addr.lastName)}`,
    escapeHtml(addr.addressLine1),
    addr.addressLine2 ? escapeHtml(addr.addressLine2) : '',
    `${escapeHtml(addr.postalCode)} ${escapeHtml(addr.city)}`,
    escapeHtml(addr.country),
  ].filter(Boolean);
  return lines.map((l) => `<p>${l}</p>`).join('');
}

export function orderConfirmationHtml(data: OrderConfirmationData): string {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">${formatPrice(item.unitPrice, data.currency)}</td>
      <td style="text-align:right;">${formatPrice(item.totalPrice, data.currency)}</td>
    </tr>`,
    )
    .join('');

  const content = `
    <h1>Order Confirmation 🎉</h1>
    <p>Hi ${escapeHtml(data.customerName)},</p>
    <p>Thank you for your order! We have received it and will process it as quickly as possible.</p>

    <p style="font-size:13px;color:#6b7280;margin-bottom:4px;">Order number</p>
    <p style="font-size:20px;font-weight:700;color:#1a1a2e;margin-top:0;">${escapeHtml(data.orderNumber)}</p>

    <hr class="divider">

    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr>
          <td colspan="3" style="text-align:right;color:#6b7280;">Subtotal</td>
          <td style="text-align:right;">${formatPrice(data.subtotal, data.currency)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:right;color:#6b7280;">Shipping</td>
          <td style="text-align:right;">${formatPrice(data.shippingTotal, data.currency)}</td>
        </tr>
        ${
          data.taxTotal > 0
            ? `<tr>
          <td colspan="3" style="text-align:right;color:#6b7280;">Tax</td>
          <td style="text-align:right;">${formatPrice(data.taxTotal, data.currency)}</td>
        </tr>`
            : ''
        }
        <tr class="total-row">
          <td colspan="3" style="text-align:right;">Total</td>
          <td style="text-align:right;">${formatPrice(data.total, data.currency)}</td>
        </tr>
      </tbody>
    </table>

    <hr class="divider">

    <h2 style="font-size:16px;margin-bottom:8px;">Shipping Address</h2>
    <div class="address-block">
      ${formatAddress(data.shippingAddress)}
    </div>

    ${
      data.billingAddress
        ? `
    <h2 style="font-size:16px;margin-bottom:8px;">Billing Address</h2>
    <div class="address-block">
      ${formatAddress(data.billingAddress)}
    </div>
    `
        : ''
    }

    <p style="margin-top:24px;">If you have any questions about your order, simply reply to this email.</p>
  `;

  return baseLayout(content, `Order Confirmation ${data.orderNumber}`);
}

export function orderConfirmationText(data: OrderConfirmationData): string {
  const items = data.items
    .map(
      (item) => `  ${item.quantity}x ${item.name} — ${formatPrice(item.totalPrice, data.currency)}`,
    )
    .join('\n');

  const addr = data.shippingAddress;

  return `ORDER CONFIRMATION

Hi ${data.customerName},

Thank you for your order!

Order number: ${data.orderNumber}

Items:
${items}

Subtotal: ${formatPrice(data.subtotal, data.currency)}
Shipping: ${formatPrice(data.shippingTotal, data.currency)}
${data.taxTotal > 0 ? `Tax: ${formatPrice(data.taxTotal, data.currency)}\n` : ''}Total: ${formatPrice(data.total, data.currency)}

Shipping address:
${addr.firstName} ${addr.lastName}
${addr.addressLine1}
${addr.addressLine2 ? addr.addressLine2 + '\n' : ''}${addr.postalCode} ${addr.city}
${addr.country}

If you have any questions about your order, simply reply to this email.

— ForkCart`;
}
