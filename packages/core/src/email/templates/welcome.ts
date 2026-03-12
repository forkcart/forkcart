import { baseLayout } from './base';

export interface WelcomeData {
  customerName: string;
  shopName?: string;
}

export function welcomeHtml(data: WelcomeData): string {
  const shop = data.shopName ?? 'ForkCart';

  const content = `
    <h1>Willkommen bei ${shop}! 👋</h1>
    <p>Hallo ${data.customerName},</p>
    <p>schön, dass du dabei bist! Dein Konto wurde erfolgreich erstellt.</p>

    <p>Du kannst jetzt:</p>
    <ul style="color:#4a4a68;font-size:15px;line-height:2;">
      <li>Bestellungen aufgeben und verfolgen</li>
      <li>Deine Adressen verwalten</li>
      <li>Deine Bestellhistorie einsehen</li>
    </ul>

    <hr class="divider">
    <p>Viel Spaß beim Stöbern!</p>
  `;

  return baseLayout(content, `Willkommen bei ${shop}!`);
}

export function welcomeText(data: WelcomeData): string {
  const shop = data.shopName ?? 'ForkCart';

  return `WILLKOMMEN BEI ${shop.toUpperCase()}!

Hallo ${data.customerName},

schön, dass du dabei bist! Dein Konto wurde erfolgreich erstellt.

Du kannst jetzt:
- Bestellungen aufgeben und verfolgen
- Deine Adressen verwalten
- Deine Bestellhistorie einsehen

Viel Spaß beim Stöbern!

— ${shop}`;
}
