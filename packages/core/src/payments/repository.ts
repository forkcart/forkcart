import { eq } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { payments, paymentTransactions } from '@forkcart/database/schemas';

export interface CreatePaymentData {
  orderId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentTransactionData {
  paymentId: string;
  type: string;
  amount: number;
  status: string;
  externalId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export class PaymentRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.payments.findFirst({
      where: eq(payments.id, id),
      with: { transactions: true },
    });
    return result ?? null;
  }

  async findByOrderId(orderId: string) {
    const result = await this.db.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
      with: { transactions: true },
    });
    return result ?? null;
  }

  async findByExternalId(externalId: string) {
    const result = await this.db.query.payments.findFirst({
      where: eq(payments.externalId, externalId),
      with: { transactions: true },
    });
    return result ?? null;
  }

  async create(data: CreatePaymentData) {
    const [payment] = await this.db.insert(payments).values(data).returning();
    if (!payment) throw new Error('Failed to create payment');
    return payment;
  }

  async updateStatus(id: string, status: string, externalId?: string) {
    const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
    if (externalId) updateData['externalId'] = externalId;

    const [payment] = await this.db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();
    return payment ?? null;
  }

  async addTransaction(data: CreatePaymentTransactionData) {
    const [tx] = await this.db.insert(paymentTransactions).values(data).returning();
    if (!tx) throw new Error('Failed to create payment transaction');
    return tx;
  }
}
