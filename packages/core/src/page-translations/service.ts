import { createLogger } from '../lib/logger';
import type {
  PageTranslationRepository,
  PageTranslation,
  PageTranslationInput,
} from './repository';

const logger = createLogger('page-translation-service');

export interface PageTranslationServiceDeps {
  pageTranslationRepository: PageTranslationRepository;
}

export class PageTranslationService {
  private readonly repo: PageTranslationRepository;

  constructor(deps: PageTranslationServiceDeps) {
    this.repo = deps.pageTranslationRepository;
  }

  async getTranslations(pageId: string): Promise<PageTranslation[]> {
    return this.repo.getTranslations(pageId);
  }

  async getTranslation(pageId: string, locale: string): Promise<PageTranslation | null> {
    return this.repo.getTranslation(pageId, locale);
  }

  async upsert(
    pageId: string,
    locale: string,
    data: PageTranslationInput,
  ): Promise<PageTranslation> {
    const result = await this.repo.upsert(pageId, locale, data);
    logger.info({ pageId, locale }, 'Page translation upserted');
    return result;
  }

  async delete(pageId: string, locale: string): Promise<void> {
    await this.repo.delete(pageId, locale);
    logger.info({ pageId, locale }, 'Page translation deleted');
  }
}
