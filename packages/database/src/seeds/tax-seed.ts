import { createDatabase } from '../connection';
import { taxClasses, taxZones, taxRules, taxSettings } from '../schemas/index';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = createDatabase(connectionString);

async function seedTax() {
  console.log('Seeding tax data...');

  // ─── Tax Classes ──────────────────────────────────────────────────────────────

  const [standardClass] = await db
    .insert(taxClasses)
    .values({ name: 'Standard', description: 'Standard tax rate', isDefault: true, sortOrder: 0 })
    .returning();

  const [reducedClass] = await db
    .insert(taxClasses)
    .values({ name: 'Reduced', description: 'Reduced tax rate (food, books, etc.)', sortOrder: 1 })
    .returning();

  const [zeroClass] = await db
    .insert(taxClasses)
    .values({ name: 'Zero', description: 'Zero-rated (exports, exempt goods)', sortOrder: 2 })
    .returning();

  console.log('Created tax classes: Standard, Reduced, Zero');

  // ─── Tax Zones ────────────────────────────────────────────────────────────────

  const zoneData: Array<{ name: string; countries: string[]; states: string[] }> = [
    { name: 'Germany', countries: ['DE'], states: [] },
    { name: 'Austria', countries: ['AT'], states: [] },
    { name: 'Switzerland', countries: ['CH'], states: [] },
    { name: 'France', countries: ['FR'], states: [] },
    { name: 'Netherlands', countries: ['NL'], states: [] },
    { name: 'Italy', countries: ['IT'], states: [] },
    { name: 'Spain', countries: ['ES'], states: [] },
    { name: 'United Kingdom', countries: ['GB'], states: [] },
    { name: 'United States', countries: ['US'], states: [] },
  ];

  const zones: Record<string, typeof taxZones.$inferSelect> = {};
  for (const z of zoneData) {
    const [zone] = await db.insert(taxZones).values(z).returning();
    zones[z.countries[0]!] = zone!;
  }
  console.log('Created tax zones for 9 countries');

  // ─── Tax Rules ────────────────────────────────────────────────────────────────

  interface RuleDef {
    name: string;
    country: string;
    standardRate: string;
    reducedRates: Array<{ name: string; rate: string }>;
    zeroRate?: boolean;
  }

  const ruleDefinitions: RuleDef[] = [
    {
      name: 'Germany',
      country: 'DE',
      standardRate: '0.19',
      reducedRates: [{ name: 'Germany Reduced VAT', rate: '0.07' }],
    },
    {
      name: 'Austria',
      country: 'AT',
      standardRate: '0.20',
      reducedRates: [{ name: 'Austria Reduced VAT', rate: '0.10' }],
    },
    {
      name: 'Switzerland',
      country: 'CH',
      standardRate: '0.081',
      reducedRates: [{ name: 'Switzerland Reduced VAT', rate: '0.026' }],
    },
    {
      name: 'France',
      country: 'FR',
      standardRate: '0.20',
      reducedRates: [{ name: 'France Reduced VAT', rate: '0.055' }],
    },
    {
      name: 'Netherlands',
      country: 'NL',
      standardRate: '0.21',
      reducedRates: [{ name: 'Netherlands Reduced VAT', rate: '0.09' }],
    },
    {
      name: 'Italy',
      country: 'IT',
      standardRate: '0.22',
      reducedRates: [
        { name: 'Italy Super-Reduced VAT', rate: '0.04' },
        { name: 'Italy Reduced VAT', rate: '0.10' },
      ],
    },
    {
      name: 'Spain',
      country: 'ES',
      standardRate: '0.21',
      reducedRates: [{ name: 'Spain Reduced VAT', rate: '0.10' }],
    },
    {
      name: 'UK',
      country: 'GB',
      standardRate: '0.20',
      reducedRates: [{ name: 'UK Reduced VAT', rate: '0.05' }],
      zeroRate: true,
    },
    {
      name: 'USA',
      country: 'US',
      standardRate: '0',
      reducedRates: [],
    },
  ];

  let ruleCount = 0;

  for (const def of ruleDefinitions) {
    const zone = zones[def.country];
    if (!zone) continue;

    // Standard rate
    await db.insert(taxRules).values({
      name: `${def.name} Standard VAT`,
      taxClassId: standardClass!.id,
      taxZoneId: zone.id,
      country: def.country,
      rate: def.standardRate,
      priority: 0,
      taxType: def.country === 'US' ? 'Sales Tax' : 'VAT',
      isDefault: def.country === 'DE',
      isActive: true,
    });
    ruleCount++;

    // Reduced rate(s)
    for (const reduced of def.reducedRates) {
      await db.insert(taxRules).values({
        name: reduced.name,
        taxClassId: reducedClass!.id,
        taxZoneId: zone.id,
        country: def.country,
        rate: reduced.rate,
        priority: 0,
        taxType: 'VAT',
        isActive: true,
      });
      ruleCount++;
    }

    // Zero rate
    if (def.zeroRate) {
      await db.insert(taxRules).values({
        name: `${def.name} Zero-Rated`,
        taxClassId: zeroClass!.id,
        taxZoneId: zone.id,
        country: def.country,
        rate: '0',
        priority: 0,
        taxType: 'VAT',
        isActive: true,
      });
      ruleCount++;
    }
  }

  // Zero class gets 0% everywhere as default fallback
  await db.insert(taxRules).values({
    name: 'Zero-Rated (Global Default)',
    taxClassId: zeroClass!.id,
    rate: '0',
    priority: -1,
    taxType: 'VAT',
    isDefault: true,
    isActive: true,
  });
  ruleCount++;

  console.log(`Created ${ruleCount} tax rules across 9 countries`);

  // ─── Tax Settings ─────────────────────────────────────────────────────────────

  await db.insert(taxSettings).values({
    taxDisplay: 'inclusive',
    defaultTaxClassId: standardClass!.id,
    pricesEnteredWithTax: true,
    enableVatValidation: false,
    defaultCountry: 'DE',
  });
  console.log('Created default tax settings (inclusive, DE)');

  console.log('Tax seeding complete!');
  process.exit(0);
}

seedTax().catch((error) => {
  console.error('Tax seed failed:', error);
  process.exit(1);
});
