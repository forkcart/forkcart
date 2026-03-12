import { eq, and, desc, asc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { taxClasses, taxZones, taxRules, taxSettings } from '@forkcart/database/schemas';
import type {
  CreateTaxClassInput,
  UpdateTaxClassInput,
  CreateTaxZoneInput,
  UpdateTaxZoneInput,
  CreateTaxRuleInput,
  UpdateTaxRuleInput,
  TaxRuleFilter,
  TaxSettingsInput,
} from '@forkcart/shared';

export class TaxRepository {
  constructor(private readonly db: Database) {}

  // ─── Tax Classes ──────────────────────────────────────────────────────────────

  async findClassById(id: string) {
    const result = await this.db.query.taxClasses.findFirst({
      where: eq(taxClasses.id, id),
    });
    return result ?? null;
  }

  async findAllClasses() {
    return this.db.query.taxClasses.findMany({
      orderBy: [asc(taxClasses.sortOrder), asc(taxClasses.name)],
    });
  }

  async findDefaultClass() {
    const result = await this.db.query.taxClasses.findFirst({
      where: eq(taxClasses.isDefault, true),
    });
    return result ?? null;
  }

  async createClass(input: CreateTaxClassInput) {
    // If setting as default, unset other defaults
    if (input.isDefault) {
      await this.db
        .update(taxClasses)
        .set({ isDefault: false })
        .where(eq(taxClasses.isDefault, true));
    }
    const [result] = await this.db.insert(taxClasses).values(input).returning();
    return result!;
  }

  async updateClass(id: string, input: UpdateTaxClassInput) {
    if (input.isDefault) {
      await this.db
        .update(taxClasses)
        .set({ isDefault: false })
        .where(eq(taxClasses.isDefault, true));
    }
    const [result] = await this.db
      .update(taxClasses)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(taxClasses.id, id))
      .returning();
    return result ?? null;
  }

  async deleteClass(id: string) {
    const result = await this.db.delete(taxClasses).where(eq(taxClasses.id, id)).returning();
    return result.length > 0;
  }

  // ─── Tax Zones ────────────────────────────────────────────────────────────────

  async findZoneById(id: string) {
    const result = await this.db.query.taxZones.findFirst({
      where: eq(taxZones.id, id),
    });
    return result ?? null;
  }

  async findAllZones() {
    return this.db.query.taxZones.findMany({
      orderBy: [asc(taxZones.sortOrder), asc(taxZones.name)],
    });
  }

  /** Find zone matching a country + optional state */
  async findZoneForAddress(country: string, state?: string) {
    const allZones = await this.findAllZones();

    // First: try exact state match
    if (state) {
      const stateCode = `${country}-${state}`;
      const stateZone = allZones.find(
        (z) => z.isActive && (z.states as string[]).includes(stateCode),
      );
      if (stateZone) return stateZone;
    }

    // Second: country match
    const countryZone = allZones.find(
      (z) => z.isActive && (z.countries as string[]).includes(country),
    );
    return countryZone ?? null;
  }

  async createZone(input: CreateTaxZoneInput) {
    const [result] = await this.db.insert(taxZones).values(input).returning();
    return result!;
  }

  async updateZone(id: string, input: UpdateTaxZoneInput) {
    const [result] = await this.db
      .update(taxZones)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(taxZones.id, id))
      .returning();
    return result ?? null;
  }

  async deleteZone(id: string) {
    const result = await this.db.delete(taxZones).where(eq(taxZones.id, id)).returning();
    return result.length > 0;
  }

  // ─── Tax Rules ────────────────────────────────────────────────────────────────

  async findRuleById(id: string) {
    const result = await this.db.query.taxRules.findFirst({
      where: eq(taxRules.id, id),
      with: { taxClass: true, taxZone: true },
    });
    return result ?? null;
  }

  async findAllRules(filter?: TaxRuleFilter) {
    const conditions = [];
    if (filter?.taxClassId) conditions.push(eq(taxRules.taxClassId, filter.taxClassId));
    if (filter?.taxZoneId) conditions.push(eq(taxRules.taxZoneId, filter.taxZoneId));
    if (filter?.country) conditions.push(eq(taxRules.country, filter.country));
    if (filter?.isActive !== undefined) conditions.push(eq(taxRules.isActive, filter.isActive));

    return this.db.query.taxRules.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: { taxClass: true, taxZone: true },
      orderBy: [desc(taxRules.priority), asc(taxRules.name)],
    });
  }

  /** Find the best matching rule for a given class + zone combination */
  async findMatchingRules(taxClassId: string | null, taxZoneId: string | null) {
    const conditions = [eq(taxRules.isActive, true)];
    if (taxClassId) conditions.push(eq(taxRules.taxClassId, taxClassId));
    if (taxZoneId) conditions.push(eq(taxRules.taxZoneId, taxZoneId));

    return this.db.query.taxRules.findMany({
      where: and(...conditions),
      with: { taxClass: true, taxZone: true },
      orderBy: [desc(taxRules.priority)],
    });
  }

  /** Find default rules (fallback when no zone matches) */
  async findDefaultRules(taxClassId?: string | null) {
    const conditions = [eq(taxRules.isActive, true), eq(taxRules.isDefault, true)];
    if (taxClassId) conditions.push(eq(taxRules.taxClassId, taxClassId));

    return this.db.query.taxRules.findMany({
      where: and(...conditions),
      with: { taxClass: true, taxZone: true },
      orderBy: [desc(taxRules.priority)],
    });
  }

  async createRule(input: CreateTaxRuleInput) {
    const [result] = await this.db.insert(taxRules).values(input).returning();
    return result!;
  }

  async updateRule(id: string, input: UpdateTaxRuleInput) {
    const [result] = await this.db
      .update(taxRules)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(taxRules.id, id))
      .returning();
    return result ?? null;
  }

  async deleteRule(id: string) {
    const result = await this.db.delete(taxRules).where(eq(taxRules.id, id)).returning();
    return result.length > 0;
  }

  // ─── Tax Settings ─────────────────────────────────────────────────────────────

  async getSettings() {
    const result = await this.db.query.taxSettings.findFirst();
    return result ?? null;
  }

  async upsertSettings(input: TaxSettingsInput) {
    const existing = await this.getSettings();
    if (existing) {
      const [result] = await this.db
        .update(taxSettings)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(taxSettings.id, existing.id))
        .returning();
      return result!;
    }
    const [result] = await this.db.insert(taxSettings).values(input).returning();
    return result!;
  }
}
