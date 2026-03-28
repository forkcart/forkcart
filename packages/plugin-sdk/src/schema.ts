/**
 * ForkCart Core Schema — type information for plugin authors.
 *
 * Plugins use `ref('products.id')` in migrations to get the correct SQL type
 * instead of guessing VARCHAR vs UUID.
 *
 * Schema is auto-derived from Drizzle table definitions at build time,
 * but we maintain a static map here for zero-dependency access in the SDK.
 */

// ─── Column Type Descriptors ────────────────────────────────────────────────

export interface ColumnInfo {
  /** SQL type string (e.g. 'UUID', 'VARCHAR(255)', 'INTEGER') */
  sqlType: string;
  /** Whether the column can be NULL */
  nullable: boolean;
  /** Whether this is a primary key */
  primaryKey?: boolean;
}

export type TableSchema = Record<string, ColumnInfo>;
export type CoreSchema = Record<string, TableSchema>;

// ─── Core Schema Map ────────────────────────────────────────────────────────
// This is the single source of truth for plugin authors.
// Generated from packages/database/src/schemas/*.ts
// Run `pnpm schema:sync` to regenerate (TODO: automate in CI).

export const coreSchema: CoreSchema = {
  products: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    name: { sqlType: 'VARCHAR(255)', nullable: false },
    slug: { sqlType: 'VARCHAR(255)', nullable: false },
    description: { sqlType: 'TEXT', nullable: true },
    short_description: { sqlType: 'VARCHAR(500)', nullable: true },
    sku: { sqlType: 'VARCHAR(100)', nullable: true },
    status: { sqlType: 'VARCHAR(20)', nullable: false },
    price: { sqlType: 'INTEGER', nullable: false },
    compare_at_price: { sqlType: 'INTEGER', nullable: true },
    cost_price: { sqlType: 'INTEGER', nullable: true },
    currency: { sqlType: 'VARCHAR(3)', nullable: false },
    weight: { sqlType: 'INTEGER', nullable: true },
    category_id: { sqlType: 'UUID', nullable: true },
    tax_class_id: { sqlType: 'UUID', nullable: true },
    manage_inventory: { sqlType: 'BOOLEAN', nullable: false },
    stock_quantity: { sqlType: 'INTEGER', nullable: false },
    low_stock_threshold: { sqlType: 'INTEGER', nullable: true },
    metadata: { sqlType: 'JSONB', nullable: true },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
    updated_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },

  variants: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    product_id: { sqlType: 'UUID', nullable: false },
    sku: { sqlType: 'VARCHAR(100)', nullable: true },
    name: { sqlType: 'VARCHAR(255)', nullable: true },
    price: { sqlType: 'INTEGER', nullable: true },
    compare_at_price: { sqlType: 'INTEGER', nullable: true },
    stock_quantity: { sqlType: 'INTEGER', nullable: false },
    weight: { sqlType: 'INTEGER', nullable: true },
    options: { sqlType: 'JSONB', nullable: true },
    is_default: { sqlType: 'BOOLEAN', nullable: false },
    sort_order: { sqlType: 'INTEGER', nullable: false },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
    updated_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },

  orders: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    order_number: { sqlType: 'VARCHAR(50)', nullable: false },
    status: { sqlType: 'VARCHAR(20)', nullable: false },
    customer_id: { sqlType: 'UUID', nullable: true },
    email: { sqlType: 'VARCHAR(255)', nullable: false },
    currency: { sqlType: 'VARCHAR(3)', nullable: false },
    subtotal: { sqlType: 'INTEGER', nullable: false },
    tax_amount: { sqlType: 'INTEGER', nullable: false },
    shipping_amount: { sqlType: 'INTEGER', nullable: false },
    discount_amount: { sqlType: 'INTEGER', nullable: false },
    total_amount: { sqlType: 'INTEGER', nullable: false },
    shipping_address: { sqlType: 'JSONB', nullable: true },
    billing_address: { sqlType: 'JSONB', nullable: true },
    notes: { sqlType: 'TEXT', nullable: true },
    metadata: { sqlType: 'JSONB', nullable: true },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
    updated_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },

  order_items: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    order_id: { sqlType: 'UUID', nullable: false },
    product_id: { sqlType: 'UUID', nullable: true },
    variant_id: { sqlType: 'UUID', nullable: true },
    name: { sqlType: 'VARCHAR(255)', nullable: false },
    sku: { sqlType: 'VARCHAR(100)', nullable: true },
    quantity: { sqlType: 'INTEGER', nullable: false },
    unit_price: { sqlType: 'INTEGER', nullable: false },
    total_price: { sqlType: 'INTEGER', nullable: false },
    metadata: { sqlType: 'JSONB', nullable: true },
  },

  customers: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    email: { sqlType: 'VARCHAR(255)', nullable: false },
    first_name: { sqlType: 'VARCHAR(100)', nullable: true },
    last_name: { sqlType: 'VARCHAR(100)', nullable: true },
    phone: { sqlType: 'VARCHAR(50)', nullable: true },
    metadata: { sqlType: 'JSONB', nullable: true },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
    updated_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },

  categories: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    name: { sqlType: 'VARCHAR(255)', nullable: false },
    slug: { sqlType: 'VARCHAR(255)', nullable: false },
    description: { sqlType: 'TEXT', nullable: true },
    parent_id: { sqlType: 'UUID', nullable: true },
    sort_order: { sqlType: 'INTEGER', nullable: false },
    is_active: { sqlType: 'BOOLEAN', nullable: false },
    image_url: { sqlType: 'TEXT', nullable: true },
    metadata: { sqlType: 'JSONB', nullable: true },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
    updated_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },

  media: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    filename: { sqlType: 'VARCHAR(255)', nullable: false },
    original_name: { sqlType: 'VARCHAR(255)', nullable: false },
    mime_type: { sqlType: 'VARCHAR(100)', nullable: false },
    size: { sqlType: 'INTEGER', nullable: false },
    url: { sqlType: 'TEXT', nullable: false },
    alt_text: { sqlType: 'VARCHAR(255)', nullable: true },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },

  payments: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    order_id: { sqlType: 'UUID', nullable: false },
    provider: { sqlType: 'VARCHAR(50)', nullable: false },
    status: { sqlType: 'VARCHAR(20)', nullable: false },
    amount: { sqlType: 'INTEGER', nullable: false },
    currency: { sqlType: 'VARCHAR(3)', nullable: false },
    metadata: { sqlType: 'JSONB', nullable: true },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
    updated_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },

  product_images: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    product_id: { sqlType: 'UUID', nullable: false },
    url: { sqlType: 'TEXT', nullable: false },
    alt_text: { sqlType: 'VARCHAR(255)', nullable: true },
    sort_order: { sqlType: 'INTEGER', nullable: false },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },

  product_reviews: {
    id: { sqlType: 'UUID', nullable: false, primaryKey: true },
    product_id: { sqlType: 'UUID', nullable: false },
    customer_id: { sqlType: 'UUID', nullable: true },
    rating: { sqlType: 'INTEGER', nullable: false },
    title: { sqlType: 'VARCHAR(255)', nullable: true },
    content: { sqlType: 'TEXT', nullable: true },
    status: { sqlType: 'VARCHAR(20)', nullable: false },
    created_at: { sqlType: 'TIMESTAMPTZ', nullable: false },
  },
};

// ─── ref() — Type-Safe Foreign Key Helper ───────────────────────────────────

/**
 * Get the SQL type for a core table column, for use in plugin migrations.
 *
 * @example
 * ```ts
 * // In migration:
 * await db.execute(`
 *   CREATE TABLE plugin_my_ratings (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     product_id ${ref('products.id')} NOT NULL,
 *     customer_id ${ref('customers.id')},
 *     score INTEGER NOT NULL
 *   )
 * `);
 * ```
 *
 * @param columnPath — dot-separated path like 'products.id' or 'orders.customer_id'
 * @returns SQL type string (e.g. 'UUID', 'VARCHAR(255)')
 * @throws Error if table or column not found in core schema
 */
export function ref(columnPath: CoreColumnPath): string {
  const [table, column] = columnPath.split('.') as [string, string];

  const tableSchema = coreSchema[table];
  if (!tableSchema) {
    throw new Error(
      `[ref] Unknown core table '${table}'. Available: ${Object.keys(coreSchema).join(', ')}`,
    );
  }

  const col = tableSchema[column];
  if (!col) {
    throw new Error(
      `[ref] Unknown column '${column}' in table '${table}'. Available: ${Object.keys(tableSchema).join(', ')}`,
    );
  }

  return col.sqlType;
}

// ─── Type-Safe Column Paths ─────────────────────────────────────────────────

/** All valid 'table.column' paths for ref() — provides autocomplete in IDEs */
export type CoreColumnPath = {
  [T in keyof typeof coreSchema]: `${T & string}.${keyof (typeof coreSchema)[T] & string}`;
}[keyof typeof coreSchema];

// ─── Migration Context ──────────────────────────────────────────────────────

/** Extended context passed to plugin migrations (in addition to db) */
export interface MigrationHelpers {
  /** Get SQL type for a core table column */
  ref: typeof ref;
  /** Full core schema for introspection */
  schema: CoreSchema;
}
