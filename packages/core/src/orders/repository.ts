import { eq, and, gte, lte, sql, desc, count, sum } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { orders, orderItems, orderStatusHistory, customers } from '@forkcart/database/schemas';
import type { Pagination } from '@forkcart/shared';
import { calculatePagination } from '@forkcart/shared';

export interface OrderFilter {
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateOrderData {
  orderNumber: string;
  customerId: string;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOrderItemData {
  orderId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metadata?: Record<string, unknown>;
}

export class OrderRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        customer: true,
        items: true,
        statusHistory: true,
      },
    });
    return result ?? null;
  }

  async findMany(filter: OrderFilter, pagination: Pagination) {
    const conditions = [];

    if (filter.status) {
      conditions.push(eq(orders.status, filter.status));
    }

    if (filter.customerId) {
      conditions.push(eq(orders.customerId, filter.customerId));
    }

    if (filter.dateFrom) {
      conditions.push(gte(orders.createdAt, new Date(filter.dateFrom)));
    }

    if (filter.dateTo) {
      conditions.push(lte(orders.createdAt, new Date(filter.dateTo)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db.query.orders.findMany({
        where,
        orderBy: [desc(orders.createdAt)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        with: {
          customer: true,
          items: true,
        },
      }),
      this.db.select({ count: count() }).from(orders).where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      pagination: calculatePagination(total, pagination.page, pagination.limit),
    };
  }

  async create(data: CreateOrderData) {
    const [order] = await this.db.insert(orders).values(data).returning();
    if (!order) throw new Error('Failed to create order');
    return order;
  }

  async createItems(items: CreateOrderItemData[]) {
    if (items.length === 0) return [];
    return this.db.insert(orderItems).values(items).returning();
  }

  async addStatusHistory(entry: {
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    note?: string;
    changedBy?: string;
  }) {
    const [result] = await this.db.insert(orderStatusHistory).values(entry).returning();
    return result;
  }

  async updateStatus(id: string, status: string) {
    const [result] = await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return result ?? null;
  }

  async getStats() {
    const [totals] = await this.db
      .select({
        totalRevenue: sum(orders.total),
        orderCount: count(),
      })
      .from(orders)
      .where(
        and(
          sql`${orders.status} NOT IN ('cancelled', 'refunded')`,
        ),
      );

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [monthlyTotals] = await this.db
      .select({
        totalRevenue: sum(orders.total),
        orderCount: count(),
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, thirtyDaysAgo),
          sql`${orders.status} NOT IN ('cancelled', 'refunded')`,
        ),
      );

    const [newCustomers] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(gte(customers.createdAt, thirtyDaysAgo));

    const recentOrders = await this.db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
      limit: 5,
      with: { customer: true },
    });

    const revenue = Number(totals?.totalRevenue ?? 0);
    const orderCount = totals?.orderCount ?? 0;
    const monthlyRevenue = Number(monthlyTotals?.totalRevenue ?? 0);
    const monthlyOrderCount = monthlyTotals?.orderCount ?? 0;

    return {
      totalRevenue: revenue,
      totalOrders: orderCount,
      averageOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
      monthlyRevenue,
      monthlyOrders: monthlyOrderCount,
      newCustomers: newCustomers?.count ?? 0,
      recentOrders,
    };
  }
}
