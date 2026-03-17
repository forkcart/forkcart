import type {
  CreateTaxClassInput,
  UpdateTaxClassInput,
  CreateTaxZoneInput,
  UpdateTaxZoneInput,
  CreateTaxRuleInput,
  UpdateTaxRuleInput,
  TaxRuleFilter,
  TaxSettingsInput,
  TaxCalculationRequest,
  TaxCalculationResult,
  TaxLineItem,
  TaxBreakdownLine,
} from '@forkcart/shared';
import { NotFoundError } from '@forkcart/shared';
import type { TaxRepository } from './repository';
import type { VatValidator } from './vat-validator';
import type { EventBus } from '../plugins/event-bus';
import type { PluginLoader } from '../plugins/plugin-loader';
import { TAX_EVENTS } from './events';
/** EU member country codes for reverse charge eligibility */
const EU_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

export interface TaxServiceDeps {
  taxRepository: TaxRepository;
  vatValidator: VatValidator;
  eventBus: EventBus;
  /** Callback to resolve a product's taxClassId by product ID */
  getProductTaxClassId?: (productId: string) => Promise<string | null>;
  /** Optional plugin loader for filter support */
  pluginLoader?: PluginLoader | null;
}

export class TaxService {
  private readonly repo: TaxRepository;
  private readonly vatValidator: VatValidator;
  private readonly events: EventBus;
  private readonly getProductTaxClassId: (productId: string) => Promise<string | null>;
  private pluginLoader: PluginLoader | null;

  constructor(deps: TaxServiceDeps) {
    this.repo = deps.taxRepository;
    this.vatValidator = deps.vatValidator;
    this.events = deps.eventBus;
    this.getProductTaxClassId = deps.getProductTaxClassId ?? (async () => null);
    this.pluginLoader = deps.pluginLoader ?? null;
  }

  /** Set plugin loader (for late injection after PluginLoader is initialized) */
  setPluginLoader(loader: PluginLoader): void {
    this.pluginLoader = loader;
  }

  // ─── Tax Classes ──────────────────────────────────────────────────────────────

  async listClasses() {
    return this.repo.findAllClasses();
  }

  async getClassById(id: string) {
    const cls = await this.repo.findClassById(id);
    if (!cls) throw new NotFoundError('TaxClass', id);
    return cls;
  }

  async createClass(input: CreateTaxClassInput) {
    const cls = await this.repo.createClass(input);
    await this.events.emit(TAX_EVENTS.TAX_CLASS_CREATED, cls);
    return cls;
  }

  async updateClass(id: string, input: UpdateTaxClassInput) {
    const cls = await this.repo.updateClass(id, input);
    if (!cls) throw new NotFoundError('TaxClass', id);
    await this.events.emit(TAX_EVENTS.TAX_CLASS_UPDATED, cls);
    return cls;
  }

  async deleteClass(id: string) {
    const deleted = await this.repo.deleteClass(id);
    if (!deleted) throw new NotFoundError('TaxClass', id);
    await this.events.emit(TAX_EVENTS.TAX_CLASS_DELETED, { id });
    return true;
  }

  // ─── Tax Zones ────────────────────────────────────────────────────────────────

  async listZones() {
    return this.repo.findAllZones();
  }

  async getZoneById(id: string) {
    const zone = await this.repo.findZoneById(id);
    if (!zone) throw new NotFoundError('TaxZone', id);
    return zone;
  }

  async createZone(input: CreateTaxZoneInput) {
    const zone = await this.repo.createZone(input);
    await this.events.emit(TAX_EVENTS.TAX_ZONE_CREATED, zone);
    return zone;
  }

  async updateZone(id: string, input: UpdateTaxZoneInput) {
    const zone = await this.repo.updateZone(id, input);
    if (!zone) throw new NotFoundError('TaxZone', id);
    await this.events.emit(TAX_EVENTS.TAX_ZONE_UPDATED, zone);
    return zone;
  }

  async deleteZone(id: string) {
    const deleted = await this.repo.deleteZone(id);
    if (!deleted) throw new NotFoundError('TaxZone', id);
    await this.events.emit(TAX_EVENTS.TAX_ZONE_DELETED, { id });
    return true;
  }

  // ─── Tax Rules ────────────────────────────────────────────────────────────────

  async listRules(filter?: TaxRuleFilter) {
    return this.repo.findAllRules(filter);
  }

  async getRuleById(id: string) {
    const rule = await this.repo.findRuleById(id);
    if (!rule) throw new NotFoundError('TaxRule', id);
    return rule;
  }

  async createRule(input: CreateTaxRuleInput) {
    const rule = await this.repo.createRule(input);
    await this.events.emit(TAX_EVENTS.TAX_RULE_CREATED, rule);
    return rule;
  }

  async updateRule(id: string, input: UpdateTaxRuleInput) {
    const rule = await this.repo.updateRule(id, input);
    if (!rule) throw new NotFoundError('TaxRule', id);
    await this.events.emit(TAX_EVENTS.TAX_RULE_UPDATED, rule);
    return rule;
  }

  async deleteRule(id: string) {
    const deleted = await this.repo.deleteRule(id);
    if (!deleted) throw new NotFoundError('TaxRule', id);
    await this.events.emit(TAX_EVENTS.TAX_RULE_DELETED, { id });
    return true;
  }

  // ─── Tax Settings ─────────────────────────────────────────────────────────────

  async getSettings() {
    return this.repo.getSettings();
  }

  async updateSettings(input: TaxSettingsInput) {
    const settings = await this.repo.upsertSettings(input);
    await this.events.emit(TAX_EVENTS.TAX_SETTINGS_UPDATED, settings);
    return settings;
  }

  // ─── Tax Calculation ──────────────────────────────────────────────────────────

  /**
   * Calculate tax for a set of items given a shipping address.
   * Supports:
   * - Tax Inclusive (EU) and Exclusive (US) modes
   * - Reverse Charge for B2B with valid EU VAT ID
   * - Compound taxes
   * - Priority-based rule matching
   */
  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    const settings = await this.repo.getSettings();
    const taxInclusive = settings?.pricesEnteredWithTax ?? true;
    const currency = 'EUR';

    // Check reverse charge eligibility
    let reverseCharge = false;
    if (request.vatId && settings?.enableVatValidation) {
      const validation = await this.vatValidator.validate(request.vatId);
      if (validation.valid) {
        const parsed = VatValidatorParseHelper(request.vatId);
        // Reverse charge: valid VAT ID + different EU country from store
        if (
          parsed &&
          EU_COUNTRIES.has(parsed.countryCode) &&
          parsed.countryCode !== (settings?.defaultCountry ?? 'DE')
        ) {
          reverseCharge = true;
        }
      }
    }

    // Find the matching tax zone
    const zone = await this.repo.findZoneForAddress(request.country, request.state);

    const items: TaxLineItem[] = [];
    const breakdownMap = new Map<string, TaxBreakdownLine>();

    for (const item of request.items) {
      // Resolve tax class for this product
      const taxClassId =
        item.taxClassId ??
        (await this.getProductTaxClassId(item.productId)) ??
        settings?.defaultTaxClassId ??
        null;

      // Find matching rules
      let matchingRules = zone ? await this.repo.findMatchingRules(taxClassId, zone.id) : [];

      // Fallback to default rules if no zone match
      if (matchingRules.length === 0) {
        matchingRules = await this.repo.findDefaultRules(taxClassId);
      }

      // No rules → zero tax
      if (matchingRules.length === 0 || reverseCharge) {
        items.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: 0,
          taxAmount: 0,
          taxType: reverseCharge ? 'Reverse Charge' : 'None',
          taxClassName: 'N/A',
        });
        continue;
      }

      // Use highest-priority rule (first in sorted array)
      const primaryRule = matchingRules[0]!;
      const rate = parseFloat(primaryRule.rate);
      const lineTotal = item.unitPrice * item.quantity;

      // Calculate tax amount
      let taxAmount: number;
      if (taxInclusive) {
        // Price includes tax: extract tax from gross price
        taxAmount = Math.round(lineTotal - lineTotal / (1 + rate));
      } else {
        // Price excludes tax: add tax on top
        taxAmount = Math.round(lineTotal * rate);
      }

      // Handle compound taxes (additional rules applied on top)
      const compoundRules = matchingRules.filter((r) => r.isCompound && r.id !== primaryRule.id);
      let compoundTax = 0;
      for (const compRule of compoundRules) {
        const compRate = parseFloat(compRule.rate);
        compoundTax += Math.round((lineTotal + taxAmount) * compRate);
      }

      const totalTax = taxAmount + compoundTax;
      const taxClassName = primaryRule.taxClass?.name ?? 'Default';
      const taxType = primaryRule.taxType;

      items.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: rate,
        taxAmount: totalTax,
        taxType,
        taxClassName,
      });

      // Aggregate breakdown by rate + type
      const breakdownKey = `${rate}-${taxType}-${taxClassName}`;
      const existing = breakdownMap.get(breakdownKey);
      const netAmount = taxInclusive ? lineTotal - taxAmount : lineTotal;
      const grossAmount = taxInclusive ? lineTotal : lineTotal + taxAmount;

      if (existing) {
        existing.netAmount += netAmount;
        existing.taxAmount += totalTax;
        existing.grossAmount += grossAmount + compoundTax;
      } else {
        breakdownMap.set(breakdownKey, {
          taxRate: rate,
          taxType,
          taxClassName,
          netAmount,
          taxAmount: totalTax,
          grossAmount: grossAmount + compoundTax,
        });
      }
    }

    const breakdown = Array.from(breakdownMap.values());
    let totalTax = items.reduce((sum, i) => sum + i.taxAmount, 0);
    const totalLineAmount = request.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    // Apply cart:tax filter — allows plugins to modify the total tax amount
    if (this.pluginLoader) {
      totalTax = await this.pluginLoader.applyFilters('cart:tax', totalTax, {
        items,
        breakdown,
        request,
        reverseCharge,
      });
    }

    let totalNet: number;
    let totalGross: number;
    if (taxInclusive) {
      totalGross = totalLineAmount;
      totalNet = totalLineAmount - totalTax;
    } else {
      totalNet = totalLineAmount;
      totalGross = totalLineAmount + totalTax;
    }

    return {
      items,
      breakdown,
      totalNet,
      totalTax,
      totalGross,
      taxInclusive,
      reverseCharge,
      currency,
    };
  }

  /**
   * Get the effective tax rate for a product in a given location.
   */
  async getTaxRateForProduct(productId: string, country: string, state?: string): Promise<number> {
    const settings = await this.repo.getSettings();
    const taxClassId =
      (await this.getProductTaxClassId(productId)) ?? settings?.defaultTaxClassId ?? null;

    const zone = await this.repo.findZoneForAddress(country, state);

    let rules = zone ? await this.repo.findMatchingRules(taxClassId, zone.id) : [];
    if (rules.length === 0) {
      rules = await this.repo.findDefaultRules(taxClassId);
    }

    if (rules.length === 0) return 0;
    return parseFloat(rules[0]!.rate);
  }

  /**
   * Get tax breakdown for items — convenience wrapper around calculateTax.
   */
  async getTaxBreakdown(
    items: TaxCalculationRequest['items'],
    address: { country: string; state?: string; vatId?: string },
  ): Promise<TaxCalculationResult> {
    return this.calculateTax({
      items,
      country: address.country,
      state: address.state,
      vatId: address.vatId,
    });
  }

  // ─── VAT Validation ──────────────────────────────────────────────────────────

  async validateVat(vatId: string) {
    return this.vatValidator.validate(vatId);
  }
}

/** Helper to parse VAT ID without importing the class */
function VatValidatorParseHelper(vatId: string): { countryCode: string; vatNumber: string } | null {
  const cleaned = vatId.replace(/[\s.-]/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z]{2})(\w+)$/);
  if (!match) return null;
  return { countryCode: match[1]!, vatNumber: match[2]! };
}
