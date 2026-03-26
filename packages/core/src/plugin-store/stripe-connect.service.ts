import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { pluginDevelopers } from '@forkcart/database/schemas';
import type { CommissionService } from './commission.service';
import { createLogger } from '../lib/logger';

const logger = createLogger('stripe-connect');

const MIN_PAYOUT_AMOUNT = 25;

export interface StripeConnectServiceDeps {
  db: Database;
  commissionService: CommissionService;
  stripeSecretKey?: string;
  stripeConnectWebhookSecret?: string;
}

export class StripeConnectService {
  private db: Database;
  private stripe: Stripe;
  private commissionService: CommissionService;
  private webhookSecret: string | undefined;

  constructor(deps: StripeConnectServiceDeps) {
    this.db = deps.db;
    this.commissionService = deps.commissionService;
    this.webhookSecret = deps.stripeConnectWebhookSecret;

    const key = deps.stripeSecretKey || process.env['STRIPE_SECRET_KEY'];
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is required for StripeConnectService');
    }
    this.stripe = new Stripe(key);
  }

  /**
   * Create a Stripe Express Connected Account for a developer.
   */
  async createConnectAccount(developerId: string, email: string, country = 'DE') {
    const dev = await this.getDeveloper(developerId);

    if (dev.stripeConnectId) {
      throw new Error('Developer already has a Stripe Connect account');
    }

    const account = await this.stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        forkcart_developer_id: developerId,
      },
    });

    await this.db
      .update(pluginDevelopers)
      .set({
        stripeConnectId: account.id,
        updatedAt: new Date(),
      })
      .where(eq(pluginDevelopers.id, developerId));

    logger.info(`Created Stripe Connect account ${account.id} for developer ${developerId}`);
    return account;
  }

  /**
   * Create a Stripe Account Link for onboarding.
   */
  async createOnboardingLink(developerId: string, returnUrl: string, refreshUrl: string) {
    const dev = await this.getDeveloper(developerId);

    if (!dev.stripeConnectId) {
      throw new Error('Developer has no Stripe Connect account — create one first');
    }

    const link = await this.stripe.accountLinks.create({
      account: dev.stripeConnectId,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });

    logger.info(`Created onboarding link for developer ${developerId}`);
    return link;
  }

  /**
   * Check if a developer's Stripe account is fully onboarded.
   */
  async checkOnboardingStatus(developerId: string) {
    const dev = await this.getDeveloper(developerId);

    if (!dev.stripeConnectId) {
      return { connected: false, chargesEnabled: false, payoutsEnabled: false, onboarded: false };
    }

    const account = await this.stripe.accounts.retrieve(dev.stripeConnectId);
    const onboarded = !!(account.charges_enabled && account.payouts_enabled);

    // Update local flag if status changed
    if (onboarded !== dev.stripeOnboardingComplete) {
      await this.db
        .update(pluginDevelopers)
        .set({
          stripeOnboardingComplete: onboarded,
          updatedAt: new Date(),
        })
        .where(eq(pluginDevelopers.id, developerId));
    }

    return {
      connected: true,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      onboarded,
    };
  }

  /**
   * Create a payout (Stripe Transfer) to the developer's connected account.
   */
  async createPayout(developerId: string, amount: string, currency = 'eur') {
    const amountNum = Number(amount);
    if (amountNum < MIN_PAYOUT_AMOUNT) {
      throw new Error(`Minimum payout amount is €${MIN_PAYOUT_AMOUNT}`);
    }

    const dev = await this.getDeveloper(developerId);
    if (!dev.stripeConnectId || !dev.stripeOnboardingComplete) {
      throw new Error('Stripe Connect onboarding must be completed before requesting payouts');
    }

    // 1. Record payout request in our DB
    const payout = await this.commissionService.requestPayout(developerId, amount);

    try {
      // 2. Send Stripe Transfer (amount in cents)
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amountNum * 100),
        currency,
        destination: dev.stripeConnectId,
        metadata: {
          forkcart_payout_id: payout.id,
          forkcart_developer_id: developerId,
        },
      });

      // 3. Mark payout as completed
      await this.commissionService.completePayout(payout.id, transfer.id);

      logger.info(
        `Payout ${payout.id} completed — Transfer ${transfer.id} (€${amount}) to ${dev.stripeConnectId}`,
      );
      return { payout, transferId: transfer.id };
    } catch (err) {
      // Transfer failed — mark payout as failed so balance can be restored
      logger.error(`Stripe Transfer failed for payout ${payout.id}: ${err}`);
      throw new Error(
        `Stripe transfer failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle Stripe Connect webhook events.
   */
  async handleConnectWebhook(rawBody: string | Buffer, signature: string) {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET not configured');
    }

    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const developerId = account.metadata?.['forkcart_developer_id'];
        if (!developerId) break;

        const onboarded = !!(account.charges_enabled && account.payouts_enabled);
        await this.db
          .update(pluginDevelopers)
          .set({
            stripeOnboardingComplete: onboarded,
            updatedAt: new Date(),
          })
          .where(eq(pluginDevelopers.id, developerId));

        logger.info(
          `Webhook: account.updated for developer ${developerId} — onboarded=${onboarded}`,
        );
        break;
      }
      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }

    return { received: true };
  }

  // ─── Internal ─────────────────────────────────────────────────────────

  private async getDeveloper(developerId: string) {
    const [dev] = await this.db
      .select()
      .from(pluginDevelopers)
      .where(eq(pluginDevelopers.id, developerId))
      .limit(1);

    if (!dev) {
      throw new Error(`Developer ${developerId} not found`);
    }
    return dev;
  }
}
