import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartService } from '../service';
import type { CartRepository } from '../repository';
import type { EventBus } from '../../plugins/event-bus';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const NOW = new Date('2026-03-19T12:00:00Z');

function makeCart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cart-1',
    sessionId: 'sess-1',
    customerId: null,
    currency: 'EUR',
    items: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    name: 'Test Product',
    slug: 'test-product',
    price: 1999,
    status: 'active',
    trackInventory: false,
    inventoryQuantity: 100,
    ...overrides,
  };
}

function makeCartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    cartId: 'cart-1',
    productId: 'prod-1',
    variantId: null,
    quantity: 1,
    product: makeProduct(),
    variant: null,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Mocks                                                             */
/* ------------------------------------------------------------------ */

function createMockRepo(): CartRepository {
  return {
    findById: vi.fn(),
    findBySessionId: vi.fn(),
    create: vi.fn(),
    findCartItem: vi.fn(),
    findCartItemById: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    getProductWithInventory: vi.fn(),
    getVariantWithInventory: vi.fn(),
    getProductImage: vi.fn(),
    findByCustomerId: vi.fn(),
    assignToCustomer: vi.fn(),
    moveItems: vi.fn(),
    deleteCart: vi.fn(),
  } as unknown as CartRepository;
}

function createMockEventBus(): EventBus {
  return { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as EventBus;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('CartService', () => {
  let service: CartService;
  let repo: ReturnType<typeof createMockRepo>;
  let events: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    repo = createMockRepo();
    events = createMockEventBus();
    service = new CartService({
      cartRepository: repo as unknown as CartRepository,
      eventBus: events as unknown as EventBus,
      mediaBaseUrl: 'https://cdn.example.com',
    });
  });

  /* ---- Create --------------------------------------------------- */

  describe('create', () => {
    it('creates a cart with sessionId', async () => {
      const cart = makeCart();
      (repo.create as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);

      const result = await service.create({ sessionId: 'sess-1' });

      expect(result.id).toBe('cart-1');
      expect(result.items).toEqual([]);
      expect(result.subtotal).toBe(0);
      expect(result.itemCount).toBe(0);
      expect(events.emit).toHaveBeenCalledWith('cart.created', { cart });
    });

    it('creates a cart with customerId', async () => {
      const cart = makeCart({ customerId: 'cust-1', sessionId: null });
      (repo.create as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);

      const result = await service.create({ customerId: 'cust-1' });

      expect(result.customerId).toBe('cust-1');
    });

    it('throws ValidationError when neither sessionId nor customerId', async () => {
      await expect(service.create({})).rejects.toThrow(
        'Either sessionId or customerId is required',
      );
    });
  });

  /* ---- getById -------------------------------------------------- */

  describe('getById', () => {
    it('returns formatted cart', async () => {
      const item = makeCartItem();
      const cart = makeCart({ items: [item] });
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue('/img/test.jpg');

      const result = await service.getById('cart-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].unitPrice).toBe(1999);
      expect(result.items[0].totalPrice).toBe(1999);
      expect(result.items[0].productImage).toBe('https://cdn.example.com/img/test.jpg');
      expect(result.subtotal).toBe(1999);
      expect(result.itemCount).toBe(1);
    });

    it('throws NotFoundError for unknown cart', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(service.getById('nope')).rejects.toThrow();
    });
  });

  /* ---- addItem -------------------------------------------------- */

  describe('addItem', () => {
    it('adds a new item to cart', async () => {
      const cart = makeCart();
      const product = makeProduct();
      const newItem = makeCartItem();

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(product);
      (repo.findCartItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (repo.addItem as ReturnType<typeof vi.fn>).mockResolvedValue(newItem);
      // After add, findById returns cart with item
      (repo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(cart)
        .mockResolvedValue(makeCart({ items: [newItem] }));
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.addItem('cart-1', { productId: 'prod-1', quantity: 1 });

      expect(repo.addItem).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(events.emit).toHaveBeenCalledWith('cart.item_added', expect.anything());
    });

    it('merges quantity when item already in cart', async () => {
      const existingItem = makeCartItem({ quantity: 2 });
      const cart = makeCart({ items: [existingItem] });
      const product = makeProduct();

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(product);
      (repo.findCartItem as ReturnType<typeof vi.fn>).mockResolvedValue(existingItem);
      (repo.updateItemQuantity as ReturnType<typeof vi.fn>).mockResolvedValue(existingItem);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.addItem('cart-1', { productId: 'prod-1', quantity: 3 });

      expect(repo.updateItemQuantity).toHaveBeenCalledWith('item-1', 5, 'cart-1');
    });

    it('adds item with variant', async () => {
      const cart = makeCart();
      const product = makeProduct();
      const variant = {
        id: 'var-1',
        productId: 'prod-1',
        name: 'Large',
        price: 2499,
        inventoryQuantity: 50,
      };

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(product);
      (repo.getVariantWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(variant);
      (repo.findCartItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (repo.addItem as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeCartItem({ variantId: 'var-1', variant }),
      );
      const cartWithVariant = makeCart({
        items: [makeCartItem({ variantId: 'var-1', variant })],
      });
      (repo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(cart)
        .mockResolvedValue(cartWithVariant);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.addItem('cart-1', {
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 1,
      });

      expect(result.items[0].variantId).toBe('var-1');
      expect(result.items[0].unitPrice).toBe(2499);
    });

    it('throws when cart not found', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.addItem('nope', { productId: 'prod-1', quantity: 1 })).rejects.toThrow();
    });

    it('throws when product not found', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeCart());
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.addItem('cart-1', { productId: 'nope', quantity: 1 })).rejects.toThrow();
    });

    it('throws when product is not active', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeCart());
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProduct({ status: 'draft' }),
      );

      await expect(service.addItem('cart-1', { productId: 'prod-1', quantity: 1 })).rejects.toThrow(
        'Product is not available',
      );
    });

    it('throws when variant does not belong to product', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeCart());
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(makeProduct());
      (repo.getVariantWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'var-1',
        productId: 'other-prod',
      });

      await expect(
        service.addItem('cart-1', { productId: 'prod-1', variantId: 'var-1', quantity: 1 }),
      ).rejects.toThrow();
    });

    it('throws when stock is insufficient', async () => {
      const product = makeProduct({ trackInventory: true, inventoryQuantity: 2 });
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeCart());
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(product);
      (repo.findCartItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.addItem('cart-1', { productId: 'prod-1', quantity: 5 })).rejects.toThrow(
        'Only 2 items available in stock',
      );
    });
  });

  /* ---- updateItem ----------------------------------------------- */

  describe('updateItem', () => {
    it('updates item quantity', async () => {
      const item = makeCartItem();
      const cart = makeCart({ items: [item] });
      const product = makeProduct();

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.findCartItemById as ReturnType<typeof vi.fn>).mockResolvedValue(item);
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(product);
      (repo.updateItemQuantity as ReturnType<typeof vi.fn>).mockResolvedValue(item);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.updateItem('cart-1', 'item-1', { quantity: 3 });

      expect(repo.updateItemQuantity).toHaveBeenCalledWith('item-1', 3, 'cart-1');
      expect(events.emit).toHaveBeenCalledWith('cart.item_updated', expect.anything());
    });

    it('removes item when quantity is 0', async () => {
      const item = makeCartItem();
      const cart = makeCart({ items: [item] });

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.findCartItemById as ReturnType<typeof vi.fn>).mockResolvedValue(item);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // After removal, cart has no items
      (repo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(cart)
        .mockResolvedValue(makeCart());

      await service.updateItem('cart-1', 'item-1', { quantity: 0 });

      expect(repo.removeItem).toHaveBeenCalledWith('item-1', 'cart-1');
      expect(events.emit).toHaveBeenCalledWith('cart.item_removed', expect.anything());
    });

    it('throws when cart not found', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.updateItem('nope', 'item-1', { quantity: 2 })).rejects.toThrow();
    });

    it('throws when item not found', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeCart());
      (repo.findCartItemById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.updateItem('cart-1', 'nope', { quantity: 2 })).rejects.toThrow();
    });

    it('throws when item belongs to different cart', async () => {
      const item = makeCartItem({ cartId: 'other-cart' });
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeCart());
      (repo.findCartItemById as ReturnType<typeof vi.fn>).mockResolvedValue(item);

      await expect(service.updateItem('cart-1', 'item-1', { quantity: 2 })).rejects.toThrow();
    });

    it('throws when stock insufficient on update', async () => {
      const item = makeCartItem();
      const cart = makeCart({ items: [item] });
      const product = makeProduct({ trackInventory: true, inventoryQuantity: 3 });

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.findCartItemById as ReturnType<typeof vi.fn>).mockResolvedValue(item);
      (repo.getProductWithInventory as ReturnType<typeof vi.fn>).mockResolvedValue(product);

      await expect(service.updateItem('cart-1', 'item-1', { quantity: 10 })).rejects.toThrow(
        'Only 3 items available in stock',
      );
    });
  });

  /* ---- removeItem ----------------------------------------------- */

  describe('removeItem', () => {
    it('removes item from cart', async () => {
      const item = makeCartItem();
      const cart = makeCart({ items: [item] });

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.findCartItemById as ReturnType<typeof vi.fn>).mockResolvedValue(item);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // After removal, empty cart
      (repo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(cart)
        .mockResolvedValue(makeCart());

      await service.removeItem('cart-1', 'item-1');

      expect(repo.removeItem).toHaveBeenCalledWith('item-1', 'cart-1');
      expect(events.emit).toHaveBeenCalledWith('cart.item_removed', expect.anything());
    });

    it('throws when item not in cart', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeCart());
      (repo.findCartItemById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.removeItem('cart-1', 'nope')).rejects.toThrow();
    });
  });

  /* ---- clear ---------------------------------------------------- */

  describe('clear', () => {
    it('clears all items from cart', async () => {
      const cart = makeCart({ items: [makeCartItem()] });
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // After clear, empty
      (repo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(cart)
        .mockResolvedValue(makeCart());

      const result = await service.clear('cart-1');

      expect(repo.clearCart).toHaveBeenCalledWith('cart-1');
      expect(result.items).toEqual([]);
      expect(events.emit).toHaveBeenCalledWith('cart.cleared', { cartId: 'cart-1' });
    });

    it('throws when cart not found', async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(service.clear('nope')).rejects.toThrow();
    });
  });

  /* ---- Price calculation ---------------------------------------- */

  describe('price calculation', () => {
    it('sums up multiple items correctly', async () => {
      const items = [
        makeCartItem({
          id: 'i1',
          productId: 'p1',
          quantity: 2,
          product: makeProduct({ price: 1000 }),
        }),
        makeCartItem({
          id: 'i2',
          productId: 'p2',
          quantity: 1,
          product: makeProduct({ id: 'p2', price: 500 }),
        }),
      ];
      const cart = makeCart({ items });

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getById('cart-1');

      // 2*1000 + 1*500 = 2500
      expect(result.subtotal).toBe(2500);
      expect(result.itemCount).toBe(3);
    });

    it('uses variant price when variant present', async () => {
      const variant = { id: 'var-1', price: 2499, name: 'XL' };
      const item = makeCartItem({ variant, variantId: 'var-1', quantity: 3 });
      const cart = makeCart({ items: [item] });

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getById('cart-1');

      expect(result.items[0].unitPrice).toBe(2499);
      expect(result.items[0].totalPrice).toBe(7497);
      expect(result.subtotal).toBe(7497);
    });

    it('allows plugin to modify subtotal via cart:total filter', async () => {
      const item = makeCartItem({ quantity: 1, product: makeProduct({ price: 1000 }) });
      const cart = makeCart({ items: [item] });

      const pluginLoader = {
        applyFilters: vi.fn().mockResolvedValue(800), // 20% discount
      };

      service = new CartService({
        cartRepository: repo as unknown as CartRepository,
        eventBus: events as unknown as EventBus,
        pluginLoader: pluginLoader as never,
      });

      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cart);
      (repo.getProductImage as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getById('cart-1');

      expect(result.subtotal).toBe(800);
      expect(pluginLoader.applyFilters).toHaveBeenCalledWith(
        'cart:total',
        1000,
        expect.objectContaining({ cartId: 'cart-1' }),
      );
    });
  });
});
