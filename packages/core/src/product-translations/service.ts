import { createLogger } from '../lib/logger';
import type {
  ProductTranslationRepository,
  ProductTranslation,
  TranslationInput,
} from './repository';
import type { TranslationAIProvider } from '../translations/service';

const logger = createLogger('product-translation-service');

/** Native language name map */
const NATIVE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pt: 'Português',
  pl: 'Polski',
  cs: 'Čeština',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  ar: 'العربية',
  ru: 'Русский',
  tr: 'Türkçe',
};

export interface ProductTranslationServiceDeps {
  productTranslationRepository: ProductTranslationRepository;
  getProduct: (id: string) => Promise<{
    name: string;
    description: string | null;
    shortDescription: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
  } | null>;
}

export class ProductTranslationService {
  private readonly repo: ProductTranslationRepository;
  private readonly getProduct: ProductTranslationServiceDeps['getProduct'];
  private aiProvider: TranslationAIProvider | null = null;

  constructor(deps: ProductTranslationServiceDeps) {
    this.repo = deps.productTranslationRepository;
    this.getProduct = deps.getProduct;
  }

  setAIProvider(provider: TranslationAIProvider | null): void {
    this.aiProvider = provider;
  }

  async getTranslations(productId: string): Promise<ProductTranslation[]> {
    return this.repo.getTranslations(productId);
  }

  async getTranslation(productId: string, locale: string): Promise<ProductTranslation | null> {
    return this.repo.getTranslation(productId, locale);
  }

  async upsert(
    productId: string,
    locale: string,
    data: TranslationInput,
  ): Promise<ProductTranslation> {
    const result = await this.repo.upsert(productId, locale, data);
    logger.info({ productId, locale }, 'Product translation upserted');
    return result;
  }

  async delete(productId: string, locale: string): Promise<void> {
    await this.repo.delete(productId, locale);
    logger.info({ productId, locale }, 'Product translation deleted');
  }

  async autoTranslate(productId: string, targetLocale: string): Promise<ProductTranslation> {
    if (!this.aiProvider) throw new Error('AI provider not configured');

    const product = await this.getProduct(productId);
    if (!product) throw new Error(`Product "${productId}" not found`);

    const targetLang = NATIVE_NAMES[targetLocale] ?? targetLocale;

    // Build the source content to translate
    const sourceFields: Record<string, string> = {};
    if (product.name) sourceFields['name'] = product.name;
    if (product.description) sourceFields['description'] = product.description;
    if (product.shortDescription) sourceFields['shortDescription'] = product.shortDescription;
    if (product.metaTitle) sourceFields['metaTitle'] = product.metaTitle;
    if (product.metaDescription) sourceFields['metaDescription'] = product.metaDescription;

    if (Object.keys(sourceFields).length === 0) {
      throw new Error('Product has no translatable content');
    }

    const response = await this.aiProvider.chat(
      [
        {
          role: 'system',
          content: `You are a professional e-commerce translator. Translate the JSON values from English to ${targetLang}. Keep the keys EXACTLY the same. Return ONLY valid JSON, no markdown, no explanation. Keep translations natural and appropriate for a product listing in an online shop.`,
        },
        {
          role: 'user',
          content: JSON.stringify(sourceFields, null, 2),
        },
      ],
      { temperature: 0.3 },
    );

    let raw = response.content.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const translated = JSON.parse(raw) as Record<string, string>;

    const translationInput: TranslationInput = {
      name: translated['name'] ?? null,
      description: translated['description'] ?? null,
      shortDescription: translated['shortDescription'] ?? null,
      metaTitle: translated['metaTitle'] ?? null,
      metaDescription: translated['metaDescription'] ?? null,
    };

    const result = await this.repo.upsert(productId, targetLocale, translationInput);
    logger.info(
      { productId, targetLocale, fields: Object.keys(translated) },
      'Product auto-translated',
    );
    return result;
  }
}
