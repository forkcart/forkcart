import type { Database } from '@forkcart/database';
import { products, productVariants, productCategories } from '@forkcart/database';
import { categories } from '@forkcart/database';
import { eq, inArray } from 'drizzle-orm';

// ─── CSV Helpers ────────────────────────────────────────────────────────────

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headerLine = lines[0]!;
  const headers = parseCSVLine(headerLine).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() ?? '';
    });
    return row;
  });
}

// ─── Export ─────────────────────────────────────────────────────────────────

const EXPORT_HEADERS = [
  'id',
  'name',
  'slug',
  'description',
  'short_description',
  'sku',
  'status',
  'price',
  'compare_at_price',
  'cost_price',
  'currency',
  'track_inventory',
  'inventory_quantity',
  'weight',
  'weight_unit',
  'categories',
  'meta_title',
  'meta_description',
  'variant_name',
  'variant_sku',
  'variant_price',
  'variant_inventory',
  'variant_attributes',
];

export async function exportProductsCSV(db: Database): Promise<string> {
  const allProducts = await db.select().from(products).orderBy(products.name);

  const allVariants = allProducts.length
    ? await db
        .select()
        .from(productVariants)
        .where(
          inArray(
            productVariants.productId,
            allProducts.map((p) => p.id),
          ),
        )
        .orderBy(productVariants.productId, productVariants.sortOrder)
    : [];

  const allCatMappings = allProducts.length
    ? await db
        .select({
          productId: productCategories.productId,
          categoryName: categories.name,
        })
        .from(productCategories)
        .innerJoin(categories, eq(productCategories.categoryId, categories.id))
        .where(
          inArray(
            productCategories.productId,
            allProducts.map((p) => p.id),
          ),
        )
    : [];

  const variantsByProduct = new Map<string, (typeof allVariants)[number][]>();
  for (const v of allVariants) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const catsByProduct = new Map<string, string[]>();
  for (const c of allCatMappings) {
    const list = catsByProduct.get(c.productId) ?? [];
    list.push(c.categoryName);
    catsByProduct.set(c.productId, list);
  }

  const rows: string[] = [EXPORT_HEADERS.join(',')];

  for (const p of allProducts) {
    const cats = catsByProduct.get(p.id)?.join('; ') ?? '';
    const variants = variantsByProduct.get(p.id) ?? [];

    const baseRow = [
      escapeCSV(p.id),
      escapeCSV(p.name),
      escapeCSV(p.slug),
      escapeCSV(p.description),
      escapeCSV(p.shortDescription),
      escapeCSV(p.sku),
      escapeCSV(p.status),
      String(p.price),
      p.compareAtPrice !== null ? String(p.compareAtPrice) : '',
      p.costPrice !== null ? String(p.costPrice) : '',
      escapeCSV(p.currency),
      p.trackInventory ? 'true' : 'false',
      String(p.inventoryQuantity),
      p.weight !== null ? String(p.weight) : '',
      escapeCSV(p.weightUnit),
      escapeCSV(cats),
      escapeCSV(p.metaTitle),
      escapeCSV(p.metaDescription),
    ];

    if (variants.length === 0) {
      rows.push([...baseRow, '', '', '', '', ''].join(','));
    } else {
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]!;
        const row = i === 0 ? baseRow : (Array(baseRow.length).fill('') as string[]);
        rows.push(
          [
            ...row,
            escapeCSV(v.name),
            escapeCSV(v.sku),
            v.price !== null ? String(v.price) : '',
            String(v.inventoryQuantity),
            escapeCSV(JSON.stringify(v.attributes)),
          ].join(','),
        );
      }
    }
  }

  return rows.join('\n');
}

// ─── Import ─────────────────────────────────────────────────────────────────

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface ProductGroup {
  productRow: Record<string, string>;
  variantRows: Record<string, string>[];
  rowIndex: number;
}

export async function importProductsCSV(db: Database, csvText: string): Promise<ImportResult> {
  const rows = parseCSV(csvText);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const allCategories = await db.select().from(categories);
  const categoryMap = new Map(allCategories.map((c) => [c.name.toLowerCase(), c.id]));

  const groups: ProductGroup[] = [];
  let currentGroup: ProductGroup | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowName = row['name'];
    if (rowName && rowName.trim()) {
      currentGroup = { productRow: row, variantRows: [], rowIndex: i + 2 };
      groups.push(currentGroup);
      if (row['variant_name']?.trim()) {
        currentGroup.variantRows.push(row);
      }
    } else if (currentGroup && row['variant_name']?.trim()) {
      currentGroup.variantRows.push(row);
    }
  }

  for (const group of groups) {
    const { productRow: row, rowIndex } = group;

    try {
      const name = row['name']?.trim();
      if (!name) {
        result.errors.push({ row: rowIndex, message: 'Missing product name' });
        result.skipped++;
        continue;
      }

      const slug = row['slug']?.trim() || slugify(name);
      const price = parseInt(row['price'] ?? '0', 10);
      if (isNaN(price) || price < 0) {
        result.errors.push({ row: rowIndex, message: `Invalid price: "${row['price']}"` });
        result.skipped++;
        continue;
      }

      const status = row['status'] ?? 'draft';
      const productData = {
        name,
        slug,
        description: row['description']?.trim() || null,
        shortDescription: row['short_description']?.trim() || null,
        sku: row['sku']?.trim() || null,
        status: ['draft', 'active', 'archived'].includes(status) ? status : 'draft',
        price,
        compareAtPrice: row['compare_at_price']
          ? parseInt(row['compare_at_price'], 10) || null
          : null,
        costPrice: row['cost_price'] ? parseInt(row['cost_price'], 10) || null : null,
        currency: row['currency']?.trim() || 'EUR',
        trackInventory: row['track_inventory'] !== 'false',
        inventoryQuantity: parseInt(row['inventory_quantity'] ?? '0', 10) || 0,
        weight: row['weight'] ? parseInt(row['weight'], 10) || null : null,
        weightUnit: row['weight_unit']?.trim() || 'g',
        metaTitle: row['meta_title']?.trim() || null,
        metaDescription: row['meta_description']?.trim() || null,
      };

      // Check if product exists (by id or slug)
      let productId: string | null = null;
      const rowId = row['id']?.trim();
      if (rowId) {
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.id, rowId))
          .limit(1);
        if (existing.length) productId = existing[0]!.id;
      }

      if (!productId) {
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.slug, slug))
          .limit(1);
        if (existing.length) productId = existing[0]!.id;
      }

      if (productId) {
        await db
          .update(products)
          .set({ ...productData, updatedAt: new Date() })
          .where(eq(products.id, productId));
        result.updated++;
      } else {
        const inserted = await db
          .insert(products)
          .values(productData)
          .returning({ id: products.id });
        const created = inserted[0];
        if (!created) {
          result.errors.push({ row: rowIndex, message: 'Failed to create product' });
          result.skipped++;
          continue;
        }
        productId = created.id;
        result.created++;
      }

      // Handle categories
      const rowCategories = row['categories']?.trim();
      if (rowCategories) {
        await db.delete(productCategories).where(eq(productCategories.productId, productId));

        const catNames = rowCategories
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean);
        for (const catName of catNames) {
          let catId = categoryMap.get(catName.toLowerCase());
          if (!catId) {
            const catSlug = slugify(catName);
            const inserted = await db
              .insert(categories)
              .values({ name: catName, slug: catSlug })
              .onConflictDoNothing()
              .returning({ id: categories.id });
            const newCat = inserted[0];
            if (newCat) {
              catId = newCat.id;
              categoryMap.set(catName.toLowerCase(), catId);
            } else {
              const found = await db
                .select({ id: categories.id })
                .from(categories)
                .where(eq(categories.slug, catSlug))
                .limit(1);
              const existing = found[0];
              if (existing) {
                catId = existing.id;
                categoryMap.set(catName.toLowerCase(), catId);
              }
            }
          }
          if (catId) {
            await db
              .insert(productCategories)
              .values({ productId, categoryId: catId })
              .onConflictDoNothing();
          }
        }
      }

      // Handle variants
      if (group.variantRows.length > 0) {
        await db.delete(productVariants).where(eq(productVariants.productId, productId));

        for (let vi = 0; vi < group.variantRows.length; vi++) {
          const vRow = group.variantRows[vi]!;
          const variantName = vRow['variant_name']?.trim();
          if (!variantName) continue;

          let attrs: Record<string, string> = {};
          const rawAttrs = vRow['variant_attributes']?.trim();
          if (rawAttrs) {
            try {
              attrs = JSON.parse(rawAttrs);
            } catch {
              // ignore invalid JSON
            }
          }

          await db.insert(productVariants).values({
            productId,
            name: variantName,
            sku: vRow['variant_sku']?.trim() || null,
            price: vRow['variant_price'] ? parseInt(vRow['variant_price'], 10) || null : null,
            inventoryQuantity: parseInt(vRow['variant_inventory'] ?? '0', 10) || 0,
            attributes: attrs,
            sortOrder: vi,
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: rowIndex, message: msg });
      result.skipped++;
    }
  }

  return result;
}
