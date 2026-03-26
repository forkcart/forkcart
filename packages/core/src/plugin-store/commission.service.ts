import { eq, desc, and, sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import {
  pluginPurchases,
  developerPayouts,
  developerBalances,
  pluginStoreListings,
} from '@forkcart/database/schemas';
import { createLogger } from '../lib/logger';

const logger = createLogger('commission-service');

/** Default commission rate — 10% (lowest in the industry) */
const DEFAULT_COMMISSION_RATE = '0.10';

export interface CommissionServiceDeps {
  db: Database;
}

export class CommissionService {
  private db: Database;

  constructor(deps: CommissionServiceDeps) {
    this.db = deps.db;
  }

  /**
   * Record a plugin purchase, calculate commission, and update developer balance.
   */
  async recordPurchase(
    listingId: string,
    buyerId: string | null,
    price: string,
    paymentExternalId: string,
    paymentProvider = 'stripe',
  ) {
    const priceNum = Number(price);
    const commissionRate = Number(DEFAULT_COMMISSION_RATE);
    const commissionAmount = (priceNum * commissionRate).toFixed(2);
    const developerAmount = (priceNum - Number(commissionAmount)).toFixed(2);

    // Get the listing to find the developer
    const listing = await this.db
      .select({ developerId: pluginStoreListings.developerId })
      .from(pluginStoreListings)
      .where(eq(pluginStoreListings.id, listingId))
      .limit(1);

    if (!listing[0]) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const developerId = listing[0].developerId;
    if (!developerId) {
      throw new Error(`Listing ${listingId} has no developer assigned`);
    }

    // Create purchase record
    const [purchase] = await this.db
      .insert(pluginPurchases)
      .values({
        listingId,
        buyerId,
        price,
        commissionRate: DEFAULT_COMMISSION_RATE,
        commissionAmount,
        developerAmount,
        paymentProvider,
        paymentExternalId,
        status: 'completed',
      })
      .returning();

    // Upsert developer balance
    await this.db
      .insert(developerBalances)
      .values({
        developerId,
        totalEarned: developerAmount,
        totalCommission: commissionAmount,
        pendingBalance: developerAmount,
      })
      .onConflictDoUpdate({
        target: developerBalances.developerId,
        set: {
          totalEarned: sql`${developerBalances.totalEarned}::numeric + ${developerAmount}::numeric`,
          totalCommission: sql`${developerBalances.totalCommission}::numeric + ${commissionAmount}::numeric`,
          pendingBalance: sql`${developerBalances.pendingBalance}::numeric + ${developerAmount}::numeric`,
          updatedAt: sql`now()`,
        },
      });

    logger.info(`Purchase recorded: ${purchase!.id} — €${price} (commission €${commissionAmount})`);
    return purchase!;
  }

  /**
   * Get developer earnings summary.
   */
  async getDevEarnings(developerId: string) {
    const [balance] = await this.db
      .select()
      .from(developerBalances)
      .where(eq(developerBalances.developerId, developerId))
      .limit(1);

    if (!balance) {
      return {
        totalEarned: '0',
        totalCommission: '0',
        totalPaidOut: '0',
        pendingBalance: '0',
      };
    }

    return {
      totalEarned: balance.totalEarned,
      totalCommission: balance.totalCommission,
      totalPaidOut: balance.totalPaidOut,
      pendingBalance: balance.pendingBalance,
    };
  }

  /**
   * Get purchase history for a developer's plugins.
   */
  async getDevPurchaseHistory(developerId: string) {
    // Get all listing IDs belonging to this developer
    const listings = await this.db
      .select({ id: pluginStoreListings.id, name: pluginStoreListings.name })
      .from(pluginStoreListings)
      .where(eq(pluginStoreListings.developerId, developerId));

    if (listings.length === 0) return [];

    const listingIds = listings.map((l) => l.id);
    const listingMap = new Map(listings.map((l) => [l.id, l.name]));

    const purchases = await this.db
      .select()
      .from(pluginPurchases)
      .where(
        listingIds.length === 1
          ? eq(pluginPurchases.listingId, listingIds[0]!)
          : sql`${pluginPurchases.listingId} = ANY(${listingIds})`,
      )
      .orderBy(desc(pluginPurchases.createdAt));

    return purchases.map((p) => ({
      ...p,
      pluginName: listingMap.get(p.listingId) ?? 'Unknown',
    }));
  }

  /**
   * Request a payout for accumulated earnings.
   */
  async requestPayout(developerId: string, amount: string) {
    const [balance] = await this.db
      .select()
      .from(developerBalances)
      .where(eq(developerBalances.developerId, developerId))
      .limit(1);

    if (!balance) {
      throw new Error('No balance found for developer');
    }

    if (Number(balance.pendingBalance) < Number(amount)) {
      throw new Error(
        `Insufficient balance: requested €${amount}, available €${balance.pendingBalance}`,
      );
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [payout] = await this.db
      .insert(developerPayouts)
      .values({
        developerId,
        amount,
        status: 'pending',
        periodStart,
        periodEnd: now,
      })
      .returning();

    // Deduct from pending balance
    await this.db
      .update(developerBalances)
      .set({
        pendingBalance: sql`${developerBalances.pendingBalance}::numeric - ${amount}::numeric`,
        updatedAt: sql`now()`,
      })
      .where(eq(developerBalances.developerId, developerId));

    logger.info(`Payout requested: ${payout!.id} — €${amount} for developer ${developerId}`);
    return payout!;
  }

  /**
   * Mark a payout as completed (called after Stripe Connect transfer succeeds).
   */
  async completePayout(payoutId: string, externalId: string) {
    const [payout] = await this.db
      .update(developerPayouts)
      .set({
        status: 'completed',
        paymentProvider: 'stripe',
        paymentExternalId: externalId,
      })
      .where(and(eq(developerPayouts.id, payoutId), eq(developerPayouts.status, 'pending')))
      .returning();

    if (!payout) {
      throw new Error(`Payout ${payoutId} not found or not in pending status`);
    }

    // Update total paid out
    await this.db
      .update(developerBalances)
      .set({
        totalPaidOut: sql`${developerBalances.totalPaidOut}::numeric + ${payout.amount}::numeric`,
        updatedAt: sql`now()`,
      })
      .where(eq(developerBalances.developerId, payout.developerId));

    logger.info(`Payout completed: ${payoutId} — external ${externalId}`);
    return payout;
  }
}
