import type { Database } from '@forkcart/database';
import { orders, orderItems } from '@forkcart/database';
import { customers } from '@forkcart/database';
import { inArray, desc } from 'drizzle-orm';

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCents(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

const EXPORT_HEADERS = [
  'order_number',
  'status',
  'created_at',
  'customer_email',
  'customer_first_name',
  'customer_last_name',
  'subtotal',
  'shipping_total',
  'tax_total',
  'discount_total',
  'total',
  'currency',
  'tax_inclusive',
  'notes',
  'item_product_name',
  'item_variant_name',
  'item_sku',
  'item_quantity',
  'item_unit_price',
  'item_total_price',
];

export async function exportOrdersCSV(db: Database): Promise<string> {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  if (!allOrders.length) {
    return EXPORT_HEADERS.join(',') + '\n';
  }

  // Fetch all order items
  const allItems = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        allOrders.map((o) => o.id),
      ),
    );

  // Fetch customer info for orders with customerId
  const customerIds = allOrders.map((o) => o.customerId).filter((id): id is string => id !== null);

  const customerMap = new Map<string, { email: string; firstName: string; lastName: string }>();
  if (customerIds.length) {
    const custRows = await db
      .select({
        id: customers.id,
        email: customers.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(customers)
      .where(inArray(customers.id, customerIds));
    for (const c of custRows) {
      customerMap.set(c.id, { email: c.email, firstName: c.firstName, lastName: c.lastName });
    }
  }

  // Group items by order
  const itemsByOrder = new Map<string, (typeof allItems)[number][]>();
  for (const item of allItems) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const rows: string[] = [EXPORT_HEADERS.join(',')];

  for (const o of allOrders) {
    const cust = o.customerId ? customerMap.get(o.customerId) : null;
    const email = cust?.email ?? o.guestEmail ?? '';
    const firstName = cust?.firstName ?? o.guestFirstName ?? '';
    const lastName = cust?.lastName ?? o.guestLastName ?? '';
    const items = itemsByOrder.get(o.id) ?? [];

    const baseRow = [
      escapeCSV(o.orderNumber),
      escapeCSV(o.status),
      escapeCSV(o.createdAt.toISOString()),
      escapeCSV(email),
      escapeCSV(firstName),
      escapeCSV(lastName),
      formatCents(o.subtotal, o.currency),
      formatCents(o.shippingTotal, o.currency),
      formatCents(o.taxTotal, o.currency),
      formatCents(o.discountTotal, o.currency),
      formatCents(o.total, o.currency),
      escapeCSV(o.currency),
      o.taxInclusive ? 'true' : 'false',
      escapeCSV(o.notes),
    ];

    if (items.length === 0) {
      rows.push([...baseRow, '', '', '', '', '', ''].join(','));
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const row = i === 0 ? baseRow : (Array(baseRow.length).fill('') as string[]);
        rows.push(
          [
            ...row,
            escapeCSV(item.productName),
            escapeCSV(item.variantName),
            escapeCSV(item.sku),
            String(item.quantity),
            formatCents(item.unitPrice, o.currency),
            formatCents(item.totalPrice, o.currency),
          ].join(','),
        );
      }
    }
  }

  return rows.join('\n');
}
