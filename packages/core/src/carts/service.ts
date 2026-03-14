import type { AddCartItemInput, UpdateCartItemInput } from '@forkcart/shared';
import { NotFoundError, ValidationError } from '@forkcart/shared';
import type { CartRepository } from './repository';
import type { EventBus } from '../plugins/event-bus';
import type { ProductTranslationService } from '../product-translations/service';
import { CART_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('cart-service');

export interface CartServiceDeps {
  cartRepository: CartRepository;
  eventBus: EventBus;
  productTranslationService?: ProductTranslationService | null;
}

/** Formatted cart item with product details and computed prices */
interface CartItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Full cart response with computed totals */
interface CartResponse {
  id: string;
  customerId: string | null;
  sessionId: string | null;
  items: CartItemResponse[];
  subtotal: number;
  itemCount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cart service — business logic for shopping carts.
 * Prices are ALWAYS read from DB, never trusted from client.
 */
export class CartService {
  private readonly repo: CartRepository;
  private readonly events: EventBus;
  private translationService: ProductTranslationService | null;

  constructor(deps: CartServiceDeps) {
    this.repo = deps.cartRepository;
    this.events = deps.eventBus;
    this.translationService = deps.productTranslationService ?? null;
  }

  /** Set product translation service (for late injection) */
  setProductTranslationService(service: ProductTranslationService): void {
    this.translationService = service;
  }

  /** Create a new cart */
  async create(
    data: { sessionId?: string; customerId?: string },
    locale?: string,
  ): Promise<CartResponse> {
    if (!data.sessionId && !data.customerId) {
      throw new ValidationError('Either sessionId or customerId is required');
    }

    const cart = await this.repo.create(data);
    logger.info({ cartId: cart.id }, 'Cart created');

    await this.events.emit(CART_EVENTS.CREATED, { cart });

    return this.formatCart(cart.id, locale);
  }

  /** Get cart by ID with full product details */
  async getById(id: string, locale?: string): Promise<CartResponse> {
    const cart = await this.repo.findById(id);
    if (!cart) {
      throw new NotFoundError('Cart', id);
    }
    return this.formatCart(id, locale);
  }

  /** Add item to cart — merges quantity if product already exists */
  async addItem(cartId: string, input: AddCartItemInput, locale?: string): Promise<CartResponse> {
    const cart = await this.repo.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }

    // Validate product exists and is active
    const product = await this.repo.getProductWithInventory(input.productId);
    if (!product) {
      throw new NotFoundError('Product', input.productId);
    }
    if (product.status !== 'active') {
      throw new ValidationError('Product is not available');
    }

    // Validate variant if provided
    let variant = null;
    if (input.variantId) {
      variant = await this.repo.getVariantWithInventory(input.variantId);
      if (!variant || variant.productId !== input.productId) {
        throw new NotFoundError('Product variant', input.variantId);
      }
    }

    // Check if item already in cart
    const existingItem = await this.repo.findCartItem(cartId, input.productId, input.variantId);
    const requestedQuantity = existingItem
      ? existingItem.quantity + input.quantity
      : input.quantity;

    // Inventory check
    if (product.trackInventory) {
      const availableStock = variant ? variant.inventoryQuantity : product.inventoryQuantity;

      if (requestedQuantity > availableStock) {
        throw new ValidationError(`Only ${availableStock} items available in stock`, {
          available: availableStock,
          requested: requestedQuantity,
        });
      }
    }

    if (existingItem) {
      // Merge: increase quantity
      await this.repo.updateItemQuantity(existingItem.id, requestedQuantity, cartId);
      logger.info(
        { cartId, itemId: existingItem.id, quantity: requestedQuantity },
        'Cart item quantity updated (merge)',
      );
    } else {
      // New item
      const item = await this.repo.addItem({
        cartId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        quantity: input.quantity,
      });
      logger.info({ cartId, itemId: item.id }, 'Cart item added');
    }

    await this.events.emit(CART_EVENTS.ITEM_ADDED, { cartId, input });

    return this.formatCart(cartId, locale);
  }

  /** Update cart item quantity */
  async updateItem(
    cartId: string,
    itemId: string,
    input: UpdateCartItemInput,
    locale?: string,
  ): Promise<CartResponse> {
    const cart = await this.repo.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }

    const item = await this.repo.findCartItemById(itemId);
    if (!item || item.cartId !== cartId) {
      throw new NotFoundError('Cart item', itemId);
    }

    // quantity 0 = remove
    if (input.quantity === 0) {
      await this.repo.removeItem(itemId, cartId);
      logger.info({ cartId, itemId }, 'Cart item removed (quantity 0)');
      await this.events.emit(CART_EVENTS.ITEM_REMOVED, { cartId, itemId });
      return this.formatCart(cartId, locale);
    }

    // Inventory check
    const product = await this.repo.getProductWithInventory(item.productId);
    if (product?.trackInventory) {
      const variant = item.variantId
        ? await this.repo.getVariantWithInventory(item.variantId)
        : null;
      const availableStock = variant ? variant.inventoryQuantity : product.inventoryQuantity;

      if (input.quantity > availableStock) {
        throw new ValidationError(`Only ${availableStock} items available in stock`, {
          available: availableStock,
          requested: input.quantity,
        });
      }
    }

    await this.repo.updateItemQuantity(itemId, input.quantity, cartId);
    logger.info({ cartId, itemId, quantity: input.quantity }, 'Cart item updated');

    await this.events.emit(CART_EVENTS.ITEM_UPDATED, { cartId, itemId, quantity: input.quantity });

    return this.formatCart(cartId, locale);
  }

  /** Remove item from cart */
  async removeItem(cartId: string, itemId: string, locale?: string): Promise<CartResponse> {
    const cart = await this.repo.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }

    const item = await this.repo.findCartItemById(itemId);
    if (!item || item.cartId !== cartId) {
      throw new NotFoundError('Cart item', itemId);
    }

    await this.repo.removeItem(itemId, cartId);
    logger.info({ cartId, itemId }, 'Cart item removed');

    await this.events.emit(CART_EVENTS.ITEM_REMOVED, { cartId, itemId });

    return this.formatCart(cartId, locale);
  }

  /** Clear all items from cart */
  async clear(cartId: string, locale?: string): Promise<CartResponse> {
    const cart = await this.repo.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }

    await this.repo.clearCart(cartId);
    logger.info({ cartId }, 'Cart cleared');

    await this.events.emit(CART_EVENTS.CLEARED, { cartId });

    return this.formatCart(cartId, locale);
  }

  /** Assign a cart to a customer. Merges items if customer already has a cart. */
  async assignToCustomer(
    cartId: string,
    customerId: string,
    locale?: string,
  ): Promise<CartResponse> {
    const cart = await this.repo.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }

    // Check if customer already has a cart
    const existingCustomerCart = await this.repo.findByCustomerId(customerId);

    if (existingCustomerCart && existingCustomerCart.id !== cartId) {
      // Merge: move items from session cart into existing customer cart
      for (const item of cart.items) {
        const existingItem = await this.repo.findCartItem(
          existingCustomerCart.id,
          item.productId,
          item.variantId,
        );
        if (existingItem) {
          // Increase quantity
          await this.repo.updateItemQuantity(
            existingItem.id,
            existingItem.quantity + item.quantity,
            existingCustomerCart.id,
          );
        } else {
          // Move item
          await this.repo.addItem({
            cartId: existingCustomerCart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          });
        }
      }

      // Delete the old session cart
      await this.repo.deleteCart(cartId);

      logger.info(
        { fromCartId: cartId, toCartId: existingCustomerCart.id, customerId },
        'Carts merged',
      );

      return this.formatCart(existingCustomerCart.id, locale);
    }

    // No existing customer cart — just assign
    await this.repo.assignToCustomer(cartId, customerId);
    logger.info({ cartId, customerId }, 'Cart assigned to customer');

    return this.formatCart(cartId, locale);
  }

  /** Format a cart with full product details and computed totals */
  private async formatCart(cartId: string, locale?: string): Promise<CartResponse> {
    const cart = await this.repo.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }

    const items: CartItemResponse[] = [];
    let subtotal = 0;
    let itemCount = 0;

    for (const item of cart.items) {
      // Price from DB — NEVER trust client
      const unitPrice = item.variant?.price ?? item.product.price;
      const totalPrice = unitPrice * item.quantity;
      const productImage = await this.repo.getProductImage(item.productId);

      // Use translated name if locale is provided
      let productName = item.product.name;
      if (locale && this.translationService) {
        try {
          const translation = await this.translationService.getTranslation(item.productId, locale);
          if (translation?.name) {
            productName = translation.name;
          }
        } catch {
          // fallback to base name
        }
      }

      items.push({
        id: item.id,
        productId: item.productId,
        productName,
        productSlug: item.product.slug,
        productImage,
        variantId: item.variantId,
        variantName: item.variant?.name ?? null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });

      subtotal += totalPrice;
      itemCount += item.quantity;
    }

    return {
      id: cart.id,
      customerId: cart.customerId,
      sessionId: cart.sessionId,
      items,
      subtotal,
      itemCount,
      currency: cart.currency,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
