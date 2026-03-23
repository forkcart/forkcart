import { Hono } from 'hono';
import type { TaxService } from '@forkcart/core';
import {
  CreateTaxClassSchema,
  UpdateTaxClassSchema,
  CreateTaxZoneSchema,
  UpdateTaxZoneSchema,
  CreateTaxRuleSchema,
  UpdateTaxRuleSchema,
  TaxRuleFilterSchema,
  TaxSettingsSchema,
  TaxCalculationRequestSchema,
  VatValidationRequestSchema,
} from '@forkcart/shared';
import { requireRole } from '../../middleware/permissions';

/** Tax management routes (Admin + Public) */
export function createTaxRoutes(taxService: TaxService) {
  const router = new Hono();

  // ─── Tax Classes ──────────────────────────────────────────────────────────────

  router.get('/classes', async (c) => {
    const classes = await taxService.listClasses();
    return c.json({ data: classes });
  });

  router.get('/classes/:id', async (c) => {
    const cls = await taxService.getClassById(c.req.param('id'));
    return c.json({ data: cls });
  });

  router.post('/classes', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreateTaxClassSchema.parse(body);
    const cls = await taxService.createClass(input);
    return c.json({ data: cls }, 201);
  });

  router.put('/classes/:id', requireRole('admin', 'superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    const body = await c.req.json();
    const input = UpdateTaxClassSchema.parse(body);
    const cls = await taxService.updateClass(id, input);
    return c.json({ data: cls });
  });

  router.delete('/classes/:id', requireRole('admin', 'superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    await taxService.deleteClass(id);
    return c.json({ success: true });
  });

  // ─── Tax Zones ────────────────────────────────────────────────────────────────

  router.get('/zones', async (c) => {
    const zones = await taxService.listZones();
    return c.json({ data: zones });
  });

  router.get('/zones/:id', async (c) => {
    const zone = await taxService.getZoneById(c.req.param('id'));
    return c.json({ data: zone });
  });

  router.post('/zones', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreateTaxZoneSchema.parse(body);
    const zone = await taxService.createZone(input);
    return c.json({ data: zone }, 201);
  });

  router.put('/zones/:id', requireRole('admin', 'superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    const body = await c.req.json();
    const input = UpdateTaxZoneSchema.parse(body);
    const zone = await taxService.updateZone(id, input);
    return c.json({ data: zone });
  });

  router.delete('/zones/:id', requireRole('admin', 'superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    await taxService.deleteZone(id);
    return c.json({ success: true });
  });

  // ─── Tax Rules ────────────────────────────────────────────────────────────────

  router.get('/rules', async (c) => {
    const query = c.req.query();
    const filter = TaxRuleFilterSchema.parse(query);
    const rules = await taxService.listRules(filter);
    return c.json({ data: rules });
  });

  router.get('/rules/:id', async (c) => {
    const rule = await taxService.getRuleById(c.req.param('id'));
    return c.json({ data: rule });
  });

  router.post('/rules', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreateTaxRuleSchema.parse(body);
    const rule = await taxService.createRule(input);
    return c.json({ data: rule }, 201);
  });

  router.put('/rules/:id', requireRole('admin', 'superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    const body = await c.req.json();
    const input = UpdateTaxRuleSchema.parse(body);
    const rule = await taxService.updateRule(id, input);
    return c.json({ data: rule });
  });

  router.delete('/rules/:id', requireRole('admin', 'superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    await taxService.deleteRule(id);
    return c.json({ success: true });
  });

  // ─── Tax Settings ─────────────────────────────────────────────────────────────

  router.get('/settings', async (c) => {
    const settings = await taxService.getSettings();
    return c.json({ data: settings });
  });

  router.put('/settings', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = TaxSettingsSchema.parse(body);
    const settings = await taxService.updateSettings(input);
    return c.json({ data: settings });
  });

  // ─── Bulk Import EU Standard Rates ──────────────────────────────────────────

  router.post('/classes/:id/import-eu-rates', requireRole('admin', 'superadmin'), async (c) => {
    const taxClassId = c.req.param('id') as string;

    // Verify the tax class exists
    await taxService.getClassById(taxClassId);

    const EU_STANDARD_RATES: Array<{ country: string; name: string; rate: number }> = [
      { country: 'DE', name: 'Germany VAT', rate: 0.19 },
      { country: 'AT', name: 'Austria VAT', rate: 0.2 },
      { country: 'FR', name: 'France VAT', rate: 0.2 },
      { country: 'IT', name: 'Italy VAT', rate: 0.22 },
      { country: 'ES', name: 'Spain VAT', rate: 0.21 },
      { country: 'NL', name: 'Netherlands VAT', rate: 0.21 },
      { country: 'BE', name: 'Belgium VAT', rate: 0.21 },
      { country: 'PT', name: 'Portugal VAT', rate: 0.23 },
      { country: 'PL', name: 'Poland VAT', rate: 0.23 },
      { country: 'SE', name: 'Sweden VAT', rate: 0.25 },
      { country: 'DK', name: 'Denmark VAT', rate: 0.25 },
      { country: 'FI', name: 'Finland VAT', rate: 0.255 },
      { country: 'IE', name: 'Ireland VAT', rate: 0.23 },
      { country: 'CZ', name: 'Czech Republic VAT', rate: 0.21 },
      { country: 'RO', name: 'Romania VAT', rate: 0.19 },
      { country: 'HU', name: 'Hungary VAT', rate: 0.27 },
      { country: 'BG', name: 'Bulgaria VAT', rate: 0.2 },
      { country: 'HR', name: 'Croatia VAT', rate: 0.25 },
      { country: 'SK', name: 'Slovakia VAT', rate: 0.2 },
      { country: 'SI', name: 'Slovenia VAT', rate: 0.22 },
      { country: 'LT', name: 'Lithuania VAT', rate: 0.21 },
      { country: 'LV', name: 'Latvia VAT', rate: 0.21 },
      { country: 'EE', name: 'Estonia VAT', rate: 0.22 },
      { country: 'CY', name: 'Cyprus VAT', rate: 0.19 },
      { country: 'MT', name: 'Malta VAT', rate: 0.18 },
      { country: 'LU', name: 'Luxembourg VAT', rate: 0.17 },
      { country: 'GR', name: 'Greece VAT', rate: 0.24 },
    ];

    const created = [];
    const existingZones = await taxService.listZones();

    for (const entry of EU_STANDARD_RATES) {
      // Create a zone for each country (or find existing)
      let zone = existingZones.find(
        (z) =>
          (z.countries as string[]).length === 1 && (z.countries as string[])[0] === entry.country,
      );
      if (!zone) {
        zone = await taxService.createZone({
          name: entry.name.replace(' VAT', ''),
          countries: [entry.country],
          states: [],
          isActive: true,
          sortOrder: 0,
        });
        existingZones.push(zone);
      }

      // Create the rule
      const rule = await taxService.createRule({
        name: entry.name,
        taxClassId: taxClassId as string,
        taxZoneId: zone.id,
        country: entry.country,
        rate: entry.rate.toString(),
        priority: 0,
        taxType: 'VAT',
        isCompound: false,
        isDefault: false,
        isActive: true,
      });
      created.push(rule);
    }

    return c.json({ data: created, count: created.length }, 201);
  });

  // ─── Public: Tax Calculation ──────────────────────────────────────────────────

  router.post('/calculate', async (c) => {
    const body = await c.req.json();
    const input = TaxCalculationRequestSchema.parse(body);
    const result = await taxService.calculateTax(input);
    return c.json({ data: result });
  });

  // ─── Public: VAT Validation ───────────────────────────────────────────────────

  router.post('/validate-vat', async (c) => {
    const body = await c.req.json();
    const { vatId } = VatValidationRequestSchema.parse(body);
    const result = await taxService.validateVat(vatId);
    return c.json({ data: result });
  });

  return router;
}
