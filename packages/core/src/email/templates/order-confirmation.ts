import { baseLayout } from './base';

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
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(cents / 100);
}

function formatAddress(addr: OrderConfirmationData['shippingAddress']): string {
  const lines = [
    `${addr.firstName} ${addr.lastName}`,
    addr.addressLine1,
    addr.addressLine2,
    `${addr.postalCode} ${addr.city}`,
    addr.country,
  ].filter(Boolean);
  return lines.map((l) => `<p>${l}</p>`).join('');
}

export function orderConfirmationHtml(data: OrderConfirmationData): string {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">${formatPrice(item.unitPrice, data.currency)}</td>
      <td style="text-align:right;">${formatPrice(item.totalPrice, data.currency)}</td>
    </tr>`,
    )
    .join('');

  const content = `
    <h1>Bestellbestätigung 🎉</h1>
    <p>Hallo ${data.customerName},</p>
    <p>vielen Dank für deine Bestellung! Wir haben sie erhalten und bearbeiten sie so schnell wie möglich.</p>

    <p style="font-size:13px;color:#6b7280;margin-bottom:4px;">Bestellnummer</p>
    <p style="font-size:20px;font-weight:700;color:#1a1a2e;margin-top:0;">${data.orderNumber}</p>

    <hr class="divider">

    <table class="order-table">
      <thead>
        <tr>
          <th>Artikel</th>
          <th style="text-align:center;">Menge</th>
          <th style="text-align:right;">Einzelpreis</th>
          <th style="text-align:right;">Gesamt</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr>
          <td colspan="3" style="text-align:right;color:#6b7280;">Zwischensumme</td>
          <td style="text-align:right;">${formatPrice(data.subtotal, data.currency)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:right;color:#6b7280;">Versand</td>
          <td style="text-align:right;">${formatPrice(data.shippingTotal, data.currency)}</td>
        </tr>
        ${
          data.taxTotal > 0
            ? `<tr>
          <td colspan="3" style="text-align:right;color:#6b7280;">MwSt.</td>
          <td style="text-align:right;">${formatPrice(data.taxTotal, data.currency)}</td>
        </tr>`
            : ''
        }
        <tr class="total-row">
          <td colspan="3" style="text-align:right;">Gesamtsumme</td>
          <td style="text-align:right;">${formatPrice(data.total, data.currency)}</td>
        </tr>
      </tbody>
    </table>

    <hr class="divider">

    <h2 style="font-size:16px;margin-bottom:8px;">Lieferadresse</h2>
    <div class="address-block">
      ${formatAddress(data.shippingAddress)}
    </div>

    ${
      data.billingAddress
        ? `
    <h2 style="font-size:16px;margin-bottom:8px;">Rechnungsadresse</h2>
    <div class="address-block">
      ${formatAddress(data.billingAddress)}
    </div>
    `
        : ''
    }

    <p style="margin-top:24px;">Bei Fragen zu deiner Bestellung antworte einfach auf diese E-Mail.</p>
  `;

  return baseLayout(content, `Bestellbestätigung ${data.orderNumber}`);
}

export function orderConfirmationText(data: OrderConfirmationData): string {
  const items = data.items
    .map(
      (item) => `  ${item.quantity}x ${item.name} — ${formatPrice(item.totalPrice, data.currency)}`,
    )
    .join('\n');

  const addr = data.shippingAddress;

  return `BESTELLBESTÄTIGUNG

Hallo ${data.customerName},

vielen Dank für deine Bestellung!

Bestellnummer: ${data.orderNumber}

Artikel:
${items}

Zwischensumme: ${formatPrice(data.subtotal, data.currency)}
Versand: ${formatPrice(data.shippingTotal, data.currency)}
${data.taxTotal > 0 ? `MwSt.: ${formatPrice(data.taxTotal, data.currency)}\n` : ''}Gesamtsumme: ${formatPrice(data.total, data.currency)}

Lieferadresse:
${addr.firstName} ${addr.lastName}
${addr.addressLine1}
${addr.addressLine2 ? addr.addressLine2 + '\n' : ''}${addr.postalCode} ${addr.city}
${addr.country}

Bei Fragen zu deiner Bestellung antworte einfach auf diese E-Mail.

— ForkCart`;
}
