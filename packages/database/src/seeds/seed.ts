import { createDatabase } from '../connection';
import {
  categories,
  products,
  productCategories,
  users,
  shippingMethods,
  taxRules,
} from '../schemas/index';
import bcrypt from 'bcryptjs';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = createDatabase(connectionString);

/** Hash password with bcrypt */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await hashPassword('admin123');
  const [adminUser] = await db
    .insert(users)
    .values({
      email: 'admin@forkcart.dev',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'superadmin',
    })
    .returning();

  console.log(`Created admin user: ${adminUser?.email}`);

  // Create categories
  const categoryData = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      sortOrder: 1,
    },
    { name: 'Clothing', slug: 'clothing', description: 'Apparel and fashion', sortOrder: 2 },
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home decor and garden supplies',
      sortOrder: 3,
    },
    { name: 'Books', slug: 'books', description: 'Physical and digital books', sortOrder: 4 },
  ];

  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`Created ${insertedCategories.length} categories`);

  // Create sample products
  const electronicsCategory = insertedCategories.find((c) => c.slug === 'electronics');
  const clothingCategory = insertedCategories.find((c) => c.slug === 'clothing');

  const productData = [
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium noise-cancelling wireless headphones with 30-hour battery life.',
      shortDescription: 'Premium wireless headphones',
      sku: 'WH-001',
      status: 'active' as const,
      price: 14999,
      compareAtPrice: 19999,
      currency: 'EUR',
      inventoryQuantity: 50,
      weight: 250,
    },
    {
      name: 'Organic Cotton T-Shirt',
      slug: 'organic-cotton-tshirt',
      description:
        'Sustainably sourced organic cotton t-shirt. Comfortable, breathable, and eco-friendly.',
      shortDescription: 'Eco-friendly cotton t-shirt',
      sku: 'TS-001',
      status: 'active' as const,
      price: 2999,
      currency: 'EUR',
      inventoryQuantity: 200,
      weight: 180,
    },
    {
      name: 'Mechanical Keyboard',
      slug: 'mechanical-keyboard',
      description: 'Full-size mechanical keyboard with Cherry MX switches and RGB backlighting.',
      shortDescription: 'Cherry MX mechanical keyboard',
      sku: 'KB-001',
      status: 'active' as const,
      price: 12999,
      compareAtPrice: 15999,
      currency: 'EUR',
      inventoryQuantity: 30,
      weight: 900,
    },
  ];

  const insertedProducts = await db.insert(products).values(productData).returning();
  console.log(`Created ${insertedProducts.length} products`);

  // Link products to categories
  const categoryLinks = [];
  if (electronicsCategory && insertedProducts[0]) {
    categoryLinks.push({ productId: insertedProducts[0].id, categoryId: electronicsCategory.id });
  }
  if (clothingCategory && insertedProducts[1]) {
    categoryLinks.push({ productId: insertedProducts[1].id, categoryId: clothingCategory.id });
  }
  if (electronicsCategory && insertedProducts[2]) {
    categoryLinks.push({ productId: insertedProducts[2].id, categoryId: electronicsCategory.id });
  }

  if (categoryLinks.length > 0) {
    await db.insert(productCategories).values(categoryLinks);
    console.log(`Linked products to categories`);
  }

  // Create shipping methods
  await db.insert(shippingMethods).values([
    {
      name: 'Standard Shipping',
      description: 'Delivery in 3-5 business days',
      price: 499,
      estimatedDays: '3-5',
      isActive: true,
      countries: ['DE', 'AT', 'CH'],
      freeAbove: 4900,
    },
    {
      name: 'Express Shipping',
      description: 'Delivery in 1-2 business days',
      price: 999,
      estimatedDays: '1-2',
      isActive: true,
      countries: ['DE', 'AT'],
    },
    {
      name: 'EU Shipping',
      description: 'Delivery in 5-10 business days within the EU',
      price: 1299,
      estimatedDays: '5-10',
      isActive: true,
      countries: ['EU'],
    },
    {
      name: 'Worldwide Shipping',
      description: 'Worldwide delivery in 10-20 business days',
      price: 2499,
      estimatedDays: '10-20',
      isActive: true,
      countries: ['WORLDWIDE'],
    },
  ]);
  console.log('Created shipping methods');

  // Create tax rules (rate as decimal string, e.g. "0.19" for 19%)
  await db.insert(taxRules).values([
    { name: 'Germany VAT', country: 'DE', rate: '0.19000', isDefault: true },
    { name: 'Germany Reduced VAT', country: 'DE', rate: '0.07000' },
    { name: 'Austria VAT', country: 'AT', rate: '0.20000' },
    { name: 'Switzerland VAT', country: 'CH', rate: '0.07700' },
  ]);
  console.log('Created tax rules');

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
