import { eq, ilike, and, count, desc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { customers, addresses, orders } from '@forkcart/database/schemas';
import type { CreateCustomerInput, UpdateCustomerInput, Pagination } from '@forkcart/shared';
import { calculatePagination } from '@forkcart/shared';

export class CustomerRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: {
        addresses: true,
      },
    });
    return result ?? null;
  }

  async findByIdWithOrders(id: string) {
    const customer = await this.db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: {
        addresses: true,
      },
    });

    if (!customer) return null;

    const customerOrders = await this.db.query.orders.findMany({
      where: eq(orders.customerId, id),
      orderBy: [desc(orders.createdAt)],
      limit: 20,
    });

    return { ...customer, orders: customerOrders };
  }

  async findByEmail(email: string) {
    const result = await this.db.query.customers.findFirst({
      where: eq(customers.email, email),
    });
    return result ?? null;
  }

  async findMany(filter: { search?: string }, pagination: Pagination) {
    const conditions = [];

    if (filter.search) {
      conditions.push(ilike(customers.email, `%${filter.search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db.query.customers.findMany({
        where,
        orderBy: [desc(customers.createdAt)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      }),
      this.db.select({ count: count() }).from(customers).where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      pagination: calculatePagination(total, pagination.page, pagination.limit),
    };
  }

  async create(input: CreateCustomerInput) {
    const [customer] = await this.db.insert(customers).values(input).returning();
    if (!customer) throw new Error('Failed to create customer');
    return customer;
  }

  async update(id: string, input: UpdateCustomerInput) {
    const [customer] = await this.db
      .update(customers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer ?? null;
  }

  async incrementOrderStats(customerId: string, orderTotal: number) {
    await this.db.execute(
      `UPDATE customers SET order_count = order_count + 1, total_spent = total_spent + ${orderTotal}, updated_at = NOW() WHERE id = '${customerId}'`,
    );
  }

  async createAddress(data: {
    customerId: string;
    firstName: string;
    lastName: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    country: string;
    addressLine2?: string;
    state?: string;
    phone?: string;
  }) {
    const [address] = await this.db.insert(addresses).values(data).returning();
    if (!address) throw new Error('Failed to create address');
    return address;
  }
}
