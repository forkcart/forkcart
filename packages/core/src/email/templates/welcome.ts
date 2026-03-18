import { baseLayout } from './base';
import { escapeHtml } from './escape-html';

export interface WelcomeData {
  customerName: string;
  shopName?: string;
}

export function welcomeHtml(data: WelcomeData): string {
  const shop = escapeHtml(data.shopName ?? 'ForkCart');

  const content = `
    <h1>Welcome to ${shop}! 👋</h1>
    <p>Hi ${escapeHtml(data.customerName)},</p>
    <p>Great to have you on board! Your account has been successfully created.</p>

    <p>You can now:</p>
    <ul style="color:#4a4a68;font-size:15px;line-height:2;">
      <li>Place and track orders</li>
      <li>Manage your addresses</li>
      <li>View your order history</li>
    </ul>

    <hr class="divider">
    <p>Happy shopping!</p>
  `;

  return baseLayout(content, `Welcome to ${shop}!`);
}

export function welcomeText(data: WelcomeData): string {
  const shop = data.shopName ?? 'ForkCart';

  return `WELCOME TO ${shop.toUpperCase()}!

Hi ${data.customerName},

Great to have you on board! Your account has been successfully created.

You can now:
- Place and track orders
- Manage your addresses
- View your order history

Happy shopping!

— ${shop}`;
}
