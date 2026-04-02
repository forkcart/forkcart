/**
 * @fileoverview Installation logic for ForkCart
 *
 * After the core install steps (config, migrations, admin, demo, keys)
 * this module builds the storefront & admin, spawns all services as
 * detached child processes, writes a `.installed` lock-file, and
 * reports the storefront URL so the UI can redirect.
 */

import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import type { InstallConfig, InstallStatus, InstallStep } from './types';
import { buildConnectionString, createDatabaseIfNotExists } from './checks';

/** Installation state — tracked globally for SSE streaming */
let installStatus: InstallStatus = {
  currentStep: 0,
  totalSteps: 9,
  steps: [],
  completed: false,
};

/**
 * Generate a secure random secret
 */
function generateSecret(bytes: number, encoding: 'base64url' | 'hex' = 'base64url'): string {
  return randomBytes(bytes).toString(encoding);
}

/**
 * Get current installation status
 */
export function getInstallStatus(): InstallStatus {
  return { ...installStatus };
}

/**
 * Reset installation status
 */
export function resetInstallStatus(): void {
  installStatus = {
    currentStep: 0,
    totalSteps: 9,
    steps: [],
    completed: false,
  };
}

/**
 * Update a step's status
 */
function updateStep(id: string, status: InstallStep['status'], message?: string): void {
  const step = installStatus.steps.find((s) => s.id === id);
  if (step) {
    step.status = status;
    if (message) step.message = message;
  }
}

/**
 * Find the ForkCart root directory.
 * Checks `FORKCART_DIR` env, then walks up from cwd / __dirname.
 */
export function findRootDir(): string {
  // Explicit env override
  const envDir = process.env['FORKCART_DIR'];
  if (envDir && existsSync(join(envDir, 'pnpm-workspace.yaml'))) {
    return envDir;
  }

  // Start from current directory and go up
  let dir = process.cwd();

  // Check if we're in packages/installer
  if (dir.includes('packages/installer')) {
    dir = join(dir, '..', '..');
  }

  if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    return dir;
  }

  // Try from __dirname
  const installerDir = dirname(import.meta.url.replace('file://', ''));
  dir = join(installerDir, '..', '..', '..');

  if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    return dir;
  }

  throw new Error('Could not find ForkCart root directory');
}

/**
 * Spawn a detached child process that survives the installer shutdown.
 * Returns the spawned PID for logging purposes.
 */


/**
 * Run the full installation process
 */
export async function runInstallation(config: InstallConfig): Promise<InstallStatus> {
  resetInstallStatus();

  const steps: InstallStep[] = [
    { id: 'config', label: 'Writing configuration...', status: 'pending' },
    { id: 'migrations', label: 'Running database migrations...', status: 'pending' },
    { id: 'admin', label: 'Creating admin account...', status: 'pending' },
    { id: 'demo', label: 'Loading demo data...', status: 'pending' },
    { id: 'keys', label: 'Generating security keys...', status: 'pending' },

    { id: 'build', label: 'Building your shop...', status: 'pending' },
    { id: 'done', label: 'Done!', status: 'pending' },
  ];

  // Remove demo step if not loading demo data
  if (!config.shop.loadDemoData) {
    const demoIndex = steps.findIndex((s) => s.id === 'demo');
    if (demoIndex !== -1) steps.splice(demoIndex, 1);
  }

  installStatus.steps = steps;
  installStatus.totalSteps = steps.length;

  const rootDir = findRootDir();

  try {
    // Step: Write configuration
    installStatus.currentStep = 1;
    updateStep('config', 'running');

    if (config.database.createDatabase) {
      await createDatabaseIfNotExists(config.database);
    }

    const connectionString = buildConnectionString(config.database);
    const envContent = generateEnvFile(connectionString, config);
    writeFileSync(join(rootDir, '.env'), envContent, 'utf-8');

    updateStep('config', 'completed');

    // Step: Run migrations
    installStatus.currentStep++;
    updateStep('migrations', 'running');

    const databaseDir = join(rootDir, 'packages', 'database');
    execSync('pnpm run migrate', {
      cwd: databaseDir,
      env: { ...process.env, DATABASE_URL: connectionString },
      stdio: 'pipe',
    });

    updateStep('migrations', 'completed');

    // Step: Create admin account
    installStatus.currentStep++;
    updateStep('admin', 'running');

    await createAdminUser(connectionString, config.admin);

    updateStep('admin', 'completed');

    // Step: Load demo data (if selected)
    if (config.shop.loadDemoData) {
      installStatus.currentStep++;
      updateStep('demo', 'running');

      await loadDemoData(connectionString);

      updateStep('demo', 'completed');
    }

    // Step: Generate security keys (already in .env — verify)
    installStatus.currentStep++;
    updateStep('keys', 'running');

    const envPath = join(rootDir, '.env');
    if (!existsSync(envPath)) {
      throw new Error('.env file was not created');
    }

    updateStep('keys', 'completed');

    // Step: Build everything
    installStatus.currentStep++;
    updateStep('build', 'running');

    execSync('pnpm build', {
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: connectionString },
      stdio: 'pipe',
      timeout: 600_000, // 10 min max
    });

    updateStep('build', 'completed');

    // Write lock file so installer won't show again
    writeFileSync(join(rootDir, '.installed'), new Date().toISOString(), 'utf-8');

    // Write .env port info for the handover
    const sfPort = String(config.shop.storefrontPort ?? 4200);

    // Step: Done — signal frontend, then hand over port to storefront
    installStatus.currentStep++;
    updateStep('done', 'completed');
    installStatus.completed = true;
    installStatus.handover = {
      storefrontPort: sfPort,
      rootDir,
    };

    return installStatus;
  } catch (error) {
    const err = error as Error;
    const currentStepObj = installStatus.steps[installStatus.currentStep - 1];
    if (currentStepObj) {
      updateStep(currentStepObj.id, 'error', err.message);
    }
    installStatus.error = err.message;
    return installStatus;
  }
}

/**
 * Generate .env file content including JWT_SECRET
 */
function generateEnvFile(connectionString: string, config: InstallConfig): string {
  const sessionSecret = generateSecret(48, 'base64url');
  const encryptionKey = generateSecret(32, 'hex');
  const revalidateSecret = generateSecret(32, 'base64url');
  const jwtSecret = randomBytes(32).toString('hex');

  const lines = [
    '# ForkCart Configuration',
    '# Generated by the ForkCart Installer',
    '',
    '# Database',
    `DATABASE_URL="${connectionString}"`,
    '',
    '# Security Keys',
    `SESSION_SECRET="${sessionSecret}"`,
    `FORKCART_ENCRYPTION_KEY="${encryptionKey}"`,
    `REVALIDATE_SECRET="${revalidateSecret}"`,
    `JWT_SECRET="${jwtSecret}"`,
    '',
    '# Admin',
    `ADMIN_EMAIL="${config.admin.email}"`,
    '',
    '# Shop Settings',
    `SHOP_NAME="${config.admin.shopName}"`,
    `DEFAULT_CURRENCY="${config.shop.currency}"`,
    `DEFAULT_LANGUAGE="${config.shop.language}"`,
    '',
    '# API Settings',
    `API_PORT=${config.shop.apiPort ?? 4000}`,
    'API_HOST=0.0.0.0',
  ];

  if (config.shop.domain) {
    lines.push('', '# CORS', `API_CORS_ORIGIN="${config.shop.domain}"`);
  }

  lines.push(
    '',
    '# Admin Settings',
    `ADMIN_PORT=${config.shop.adminPort ?? 4201}`,
    '',
    '# Storefront Settings',
    `STOREFRONT_PORT=${config.shop.storefrontPort ?? 4200}`,
  );

  return lines.join('\n') + '\n';
}

/**
 * Create admin user directly in database
 */
async function createAdminUser(
  connectionString: string,
  adminConfig: { email: string; password: string; shopName: string },
): Promise<void> {
  const sql = postgres(connectionString, { max: 1 });

  try {
    const passwordHash = await bcrypt.hash(adminConfig.password, 12);

    const existing = await sql`
      SELECT id FROM users WHERE email = ${adminConfig.email}
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE users 
        SET password_hash = ${passwordHash}, role = 'superadmin'
        WHERE email = ${adminConfig.email}
      `;
    } else {
      await sql`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES (${adminConfig.email}, ${passwordHash}, 'Admin', 'User', 'superadmin')
      `;
    }
  } finally {
    await sql.end();
  }
}

/**
 * Load demo data (products, categories, etc.)
 */
async function loadDemoData(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1 });

  try {
    const existingCategories = await sql`SELECT COUNT(*)::int as count FROM categories`;
    const categoryCount = existingCategories[0]?.count ?? 0;

    if (categoryCount > 0) {
      return;
    }

    const categoryData = [
      {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
        sort_order: 1,
      },
      { name: 'Clothing', slug: 'clothing', description: 'Apparel and fashion', sort_order: 2 },
      {
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Home decor and garden supplies',
        sort_order: 3,
      },
      { name: 'Books', slug: 'books', description: 'Physical and digital books', sort_order: 4 },
    ];

    const insertedCategories = await sql`
      INSERT INTO categories ${sql(categoryData)}
      RETURNING id, slug
    `;

    const electronicsId = insertedCategories.find((c) => c.slug === 'electronics')?.id;
    const clothingId = insertedCategories.find((c) => c.slug === 'clothing')?.id;

    const productData = [
      {
        name: 'Wireless Headphones',
        slug: 'wireless-headphones',
        description: 'Premium noise-cancelling wireless headphones with 30-hour battery life.',
        short_description: 'Premium wireless headphones',
        sku: 'WH-001',
        status: 'active',
        price: 14999,
        compare_at_price: 19999,
        currency: 'EUR',
        inventory_quantity: 50,
        weight: 250,
      },
      {
        name: 'Organic Cotton T-Shirt',
        slug: 'organic-cotton-tshirt',
        description: 'Sustainably sourced organic cotton t-shirt. Comfortable and eco-friendly.',
        short_description: 'Eco-friendly cotton t-shirt',
        sku: 'TS-001',
        status: 'active',
        price: 2999,
        compare_at_price: null,
        currency: 'EUR',
        inventory_quantity: 200,
        weight: 180,
      },
      {
        name: 'Mechanical Keyboard',
        slug: 'mechanical-keyboard',
        description: 'Full-size mechanical keyboard with Cherry MX switches and RGB backlighting.',
        short_description: 'Cherry MX mechanical keyboard',
        sku: 'KB-001',
        status: 'active',
        price: 12999,
        compare_at_price: 15999,
        currency: 'EUR',
        inventory_quantity: 30,
        weight: 900,
      },
    ];

    const insertedProducts = await sql`
      INSERT INTO products ${sql(productData)}
      RETURNING id
    `;

    if (electronicsId && insertedProducts[0]) {
      await sql`
        INSERT INTO product_categories (product_id, category_id)
        VALUES (${insertedProducts[0].id}, ${electronicsId})
      `;
    }
    if (clothingId && insertedProducts[1]) {
      await sql`
        INSERT INTO product_categories (product_id, category_id)
        VALUES (${insertedProducts[1].id}, ${clothingId})
      `;
    }
    if (electronicsId && insertedProducts[2]) {
      await sql`
        INSERT INTO product_categories (product_id, category_id)
        VALUES (${insertedProducts[2].id}, ${electronicsId})
      `;
    }

    await sql`
      INSERT INTO shipping_methods (name, description, price, estimated_days, is_active, countries, free_above)
      VALUES 
        ('Standard Shipping', 'Delivery in 3-5 business days', 499, '3-5', true, '["DE", "AT", "CH"]'::jsonb, 4900),
        ('Express Shipping', 'Delivery in 1-2 business days', 999, '1-2', true, '["DE", "AT"]'::jsonb, NULL),
        ('EU Shipping', 'Delivery in 5-10 business days within the EU', 1299, '5-10', true, '["EU"]'::jsonb, NULL),
        ('Worldwide Shipping', 'Worldwide delivery in 10-20 business days', 2499, '10-20', true, '["WORLDWIDE"]'::jsonb, NULL)
    `;

    await sql`
      INSERT INTO tax_rules (name, country, rate, is_default)
      VALUES 
        ('Germany VAT', 'DE', 0.19000, true),
        ('Germany Reduced VAT', 'DE', 0.07000, false),
        ('Austria VAT', 'AT', 0.20000, false),
        ('Switzerland VAT', 'CH', 0.07700, false)
    `;
  } finally {
    await sql.end();
  }
}
