import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { wishlists } from '@forkcart/database/schemas';

export class WishlistRepository {
  constructor(private readonly db: Database) {}

  async findByCustomerId(customerId: string) {
    return this.db.query.wishlists.findMany({
      where: eq(wishlists.customerId, customerId),
      orderBy: [desc(wishlists.createdAt)],
    });
  }

  async findByCustomerAndProduct(customerId: string, productId: string) {
    const result = await this.db.query.wishlists.findFirst({
      where: and(eq(wishlists.customerId, customerId), eq(wishlists.productId, productId)),
    });
    return result ?? null;
  }

  async add(customerId: string, productId: string) {
    const [item] = await this.db
      .insert(wishlists)
      .values({ customerId, productId })
      .onConflictDoNothing()
      .returning();
    return item ?? null;
  }

  async remove(customerId: string, productId: string) {
    const [item] = await this.db
      .delete(wishlists)
      .where(and(eq(wishlists.customerId, customerId), eq(wishlists.productId, productId)))
      .returning();
    return item ?? null;
  }
}
