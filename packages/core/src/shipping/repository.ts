import { eq } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { shippingMethods } from '@forkcart/database/schemas';

export interface CreateShippingMethodInput {
  name: string;
  description?: string;
  price: number;
  estimatedDays?: string;
  isActive?: boolean;
  countries: string[];
  minOrderValue?: number;
  freeAbove?: number;
}

export interface UpdateShippingMethodInput {
  name?: string;
  description?: string;
  price?: number;
  estimatedDays?: string;
  isActive?: boolean;
  countries?: string[];
  minOrderValue?: number | null;
  freeAbove?: number | null;
}

/** Shipping method repository — data access layer */
export class ShippingRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.shippingMethods.findFirst({
      where: eq(shippingMethods.id, id),
    });
    return result ?? null;
  }

  async findAll() {
    return this.db.query.shippingMethods.findMany({
      orderBy: (m, { asc }) => [asc(m.name)],
    });
  }

  async findActive() {
    return this.db.query.shippingMethods.findMany({
      where: eq(shippingMethods.isActive, true),
      orderBy: (m, { asc }) => [asc(m.price)],
    });
  }

  async create(input: CreateShippingMethodInput) {
    const [method] = await this.db
      .insert(shippingMethods)
      .values({
        name: input.name,
        description: input.description,
        price: input.price,
        estimatedDays: input.estimatedDays,
        isActive: input.isActive ?? true,
        countries: input.countries,
        minOrderValue: input.minOrderValue,
        freeAbove: input.freeAbove,
      })
      .returning();
    return method!;
  }

  async update(id: string, input: UpdateShippingMethodInput) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) values['name'] = input.name;
    if (input.description !== undefined) values['description'] = input.description;
    if (input.price !== undefined) values['price'] = input.price;
    if (input.estimatedDays !== undefined) values['estimatedDays'] = input.estimatedDays;
    if (input.isActive !== undefined) values['isActive'] = input.isActive;
    if (input.countries !== undefined) values['countries'] = input.countries;
    if (input.minOrderValue !== undefined) values['minOrderValue'] = input.minOrderValue;
    if (input.freeAbove !== undefined) values['freeAbove'] = input.freeAbove;

    const [method] = await this.db
      .update(shippingMethods)
      .set(values)
      .where(eq(shippingMethods.id, id))
      .returning();
    return method ?? null;
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(shippingMethods)
      .where(eq(shippingMethods.id, id))
      .returning();
    return !!deleted;
  }
}
