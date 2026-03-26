import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { pluginStoreListings, pluginLicenses, pluginPurchases } from '@forkcart/database/schemas';
import type { CommissionService } from './commission.service';
import { createLogger } from '../lib/logger';

const logger = createLogger('plugin-stripe-checkout');

export interface StripeCheckoutServiceDeps {
  db: Database;
  commissionService: CommissionService;
}

/** Generate a license key: fc_ prefix + UUID */
function generateLicenseKey(): string {
  return `fc_${randomUUID()}`;
}

export class StripeCheckoutService {
  private stripe: Stripe;
  private db: Database;
  private commissionService: CommissionService;
  private webhookSecret: string;

  constructor(deps: StripeCheckoutServiceDeps) {
    const secretKey = process.env['STRIPE_SECRET_KEY'];
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';
    this.stripe = new Stripe(secretKey);
    this.db = deps.db;
    this.commissionService = deps.commissionService;
  }

  /**
   * Create a Stripe Checkout Session for a plugin purchase.
   */
  async createCheckoutSession(
    listingId: string,
    buyerId: string | null,
    successUrl: string,
    cancelUrl: string,
  ) {
    // Fetch listing
    const [listing] = await this.db
      .select()
      .from(pluginStoreListings)
      .where(eq(pluginStoreListings.id, listingId))
      .limit(1);

    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    if (listing.pricing === 'free' || !listing.price) {
      throw new Error('Cannot create checkout for a free plugin');
    }

    // Convert EUR price to cents for Stripe
    const priceInCents = Math.round(Number(listing.price) * 100);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      currency: (listing.currency ?? 'EUR').toLowerCase(),
      line_items: [
        {
          price_data: {
            currency: (listing.currency ?? 'EUR').toLowerCase(),
            product_data: {
              name: listing.name,
              description: listing.shortDescription ?? undefined,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        listing_id: listingId,
        buyer_id: buyerId ?? '',
        commission_rate: '0.10',
        type: 'plugin_purchase',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    logger.info(`Checkout session created: ${session.id} for listing ${listingId}`);

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Verify and parse a Stripe webhook event.
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /**
   * Handle checkout.session.completed — record purchase + generate license.
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata ?? {};
    const listingId = metadata['listing_id'];
    const buyerId = metadata['buyer_id'] || null;
    const type = metadata['type'];

    if (type !== 'plugin_purchase' || !listingId) {
      logger.info(`Ignoring checkout session ${session.id} — not a plugin purchase`);
      return null;
    }

    // Get the listing price (DB is source of truth)
    const [listing] = await this.db
      .select({ price: pluginStoreListings.price })
      .from(pluginStoreListings)
      .where(eq(pluginStoreListings.id, listingId))
      .limit(1);

    if (!listing?.price) {
      throw new Error(`Listing ${listingId} not found or has no price`);
    }

    // Record purchase via CommissionService
    const purchase = await this.commissionService.recordPurchase(
      listingId,
      buyerId,
      listing.price,
      session.id,
      'stripe',
    );

    // Generate and store license key
    const licenseKey = generateLicenseKey();
    const [license] = await this.db
      .insert(pluginLicenses)
      .values({
        purchaseId: purchase.id,
        listingId,
        licenseKey,
        status: 'active',
      })
      .returning();

    logger.info(
      `Plugin purchase completed: ${purchase.id}, license: ${licenseKey.slice(0, 12)}...`,
    );

    return {
      purchase,
      license: license!,
    };
  }

  /**
   * Handle a full webhook event dispatch.
   */
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        return this.handleCheckoutCompleted(session);
      }
      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
        return null;
    }
  }

  /**
   * Get all purchases for a buyer.
   */
  async getUserPurchases(buyerId: string) {
    return this.db
      .select({
        id: pluginPurchases.id,
        listingId: pluginPurchases.listingId,
        price: pluginPurchases.price,
        currency: pluginPurchases.currency,
        status: pluginPurchases.status,
        createdAt: pluginPurchases.createdAt,
        pluginName: pluginStoreListings.name,
        pluginSlug: pluginStoreListings.slug,
      })
      .from(pluginPurchases)
      .innerJoin(pluginStoreListings, eq(pluginPurchases.listingId, pluginStoreListings.id))
      .where(eq(pluginPurchases.buyerId, buyerId))
      .orderBy(desc(pluginPurchases.createdAt));
  }

  /**
   * Get the license for a specific user + listing.
   */
  async getUserLicense(buyerId: string, listingId: string) {
    const [license] = await this.db
      .select({
        id: pluginLicenses.id,
        licenseKey: pluginLicenses.licenseKey,
        domain: pluginLicenses.domain,
        status: pluginLicenses.status,
        expiresAt: pluginLicenses.expiresAt,
        createdAt: pluginLicenses.createdAt,
      })
      .from(pluginLicenses)
      .innerJoin(pluginPurchases, eq(pluginLicenses.purchaseId, pluginPurchases.id))
      .where(and(eq(pluginPurchases.buyerId, buyerId), eq(pluginLicenses.listingId, listingId)))
      .limit(1);

    return license ?? null;
  }
}
