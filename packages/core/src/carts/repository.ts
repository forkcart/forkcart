import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { carts, cartItems, products, productVariants, media } from '@forkcart/database/schemas';

/** Cart repository — data access layer */
export class CartRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const cart = await this.db.query.carts.findFirst({
      where: eq(carts.id, id),
      with: {
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });
    return cart ?? null;
  }

  async findBySessionId(sessionId: string) {
    const cart = await this.db.query.carts.findFirst({
      where: eq(carts.sessionId, sessionId),
      with: {
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });
    return cart ?? null;
  }

  async create(data: { sessionId?: string; customerId?: string; currency?: string }) {
    const [cart] = await this.db
      .insert(carts)
      .values({
        sessionId: data.sessionId,
        customerId: data.customerId,
        currency: data.currency ?? 'EUR',
      })
      .returning();

    if (!cart) {
      throw new Error('Failed to create cart');
    }
    return cart;
  }

  async findCartItem(cartId: string, productId: string, variantId?: string | null) {
    const conditions = [eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)];

    if (variantId) {
      conditions.push(eq(cartItems.variantId, variantId));
    } else {
      conditions.push(sql`${cartItems.variantId} IS NULL`);
    }

    const item = await this.db.query.cartItems.findFirst({
      where: and(...conditions),
    });
    return item ?? null;
  }

  async findCartItemById(itemId: string) {
    const item = await this.db.query.cartItems.findFirst({
      where: eq(cartItems.id, itemId),
      with: {
        product: true,
        variant: true,
      },
    });
    return item ?? null;
  }

  async addItem(data: {
    cartId: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
  }) {
    const [item] = await this.db
      .insert(cartItems)
      .values({
        cartId: data.cartId,
        productId: data.productId,
        variantId: data.variantId ?? null,
        quantity: data.quantity,
      })
      .returning();

    if (!item) {
      throw new Error('Failed to add cart item');
    }

    await this.touchCart(data.cartId);
    return item;
  }

  async updateItemQuantity(itemId: string, quantity: number, cartId: string) {
    const [item] = await this.db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, itemId))
      .returning();

    await this.touchCart(cartId);
    return item ?? null;
  }

  async removeItem(itemId: string, cartId: string) {
    const result = await this.db.delete(cartItems).where(eq(cartItems.id, itemId)).returning();

    await this.touchCart(cartId);
    return result.length > 0;
  }

  async clearCart(cartId: string) {
    await this.db.delete(cartItems).where(eq(cartItems.cartId, cartId));
    await this.touchCart(cartId);
  }

  async getProductWithInventory(productId: string) {
    const product = await this.db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    return product ?? null;
  }

  async getVariantWithInventory(variantId: string) {
    const variant = await this.db.query.productVariants.findFirst({
      where: eq(productVariants.id, variantId),
    });
    return variant ?? null;
  }

  async getProductImage(productId: string): Promise<string | null> {
    const [image] = await this.db
      .select({ path: media.path })
      .from(media)
      .where(and(eq(media.entityType, 'product'), eq(media.entityId, productId)))
      .orderBy(media.sortOrder)
      .limit(1);

    return image?.path ?? null;
  }

  private async touchCart(cartId: string) {
    await this.db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
  }
}
