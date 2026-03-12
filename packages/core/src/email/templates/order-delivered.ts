import { baseLayout } from './base';

export interface OrderDeliveredData {
  orderNumber: string;
  customerName: string;
}

export function orderDeliveredHtml(data: OrderDeliveredData): string {
  const content = `
    <h1>Deine Bestellung wurde zugestellt! ✅</h1>
    <p>Hallo ${data.customerName},</p>
    <p>deine Bestellung <strong>${data.orderNumber}</strong> wurde erfolgreich zugestellt.</p>

    <p>Wir hoffen, du bist zufrieden mit deiner Bestellung! Falls es Probleme gibt oder du Fragen hast, antworte einfach auf diese E-Mail.</p>

    <hr class="divider">
    <p style="font-size:13px;color:#6b7280;">Vielen Dank für deinen Einkauf bei uns!</p>
  `;

  return baseLayout(content, `Bestellung ${data.orderNumber} zugestellt`);
}

export function orderDeliveredText(data: OrderDeliveredData): string {
  return `ZUSTELLUNG BESTÄTIGT

Hallo ${data.customerName},

deine Bestellung ${data.orderNumber} wurde erfolgreich zugestellt.

Wir hoffen, du bist zufrieden! Falls es Probleme gibt, antworte einfach auf diese E-Mail.

— ForkCart`;
}
