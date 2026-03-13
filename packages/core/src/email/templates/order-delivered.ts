import { baseLayout } from './base';

export interface OrderDeliveredData {
  orderNumber: string;
  customerName: string;
}

export function orderDeliveredHtml(data: OrderDeliveredData): string {
  const content = `
    <h1>Your Order Has Been Delivered! ✅</h1>
    <p>Hi ${data.customerName},</p>
    <p>Your order <strong>${data.orderNumber}</strong> has been successfully delivered.</p>

    <p>We hope you're happy with your order! If there are any issues or you have questions, simply reply to this email.</p>

    <hr class="divider">
    <p style="font-size:13px;color:#6b7280;">Thank you for shopping with us!</p>
  `;

  return baseLayout(content, `Order ${data.orderNumber} delivered`);
}

export function orderDeliveredText(data: OrderDeliveredData): string {
  return `DELIVERY CONFIRMED

Hi ${data.customerName},

Your order ${data.orderNumber} has been successfully delivered.

We hope you're happy with your purchase! If there are any issues, simply reply to this email.

— ForkCart`;
}
