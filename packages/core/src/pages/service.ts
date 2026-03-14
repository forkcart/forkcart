import { NotFoundError, ConflictError } from '@forkcart/shared';
import type { Pagination } from '@forkcart/shared';
import type { PageRepository, CreatePageInput, UpdatePageInput, PageFilter } from './repository';
import type { EventBus } from '../plugins/event-bus';
import { PAGE_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('page-service');

/** Dependencies injected into the page service */
export interface PageServiceDeps {
  pageRepository: PageRepository;
  eventBus: EventBus;
}

/**
 * Page service — pure business logic.
 * No HTTP concerns, no direct database access. Depends on repository interfaces.
 */
export class PageService {
  private readonly repo: PageRepository;
  private readonly events: EventBus;

  constructor(deps: PageServiceDeps) {
    this.repo = deps.pageRepository;
    this.events = deps.eventBus;
  }

  async getById(id: string) {
    const page = await this.repo.findById(id);
    if (!page) {
      throw new NotFoundError('Page', id);
    }
    return page;
  }

  async getBySlug(slug: string) {
    const page = await this.repo.findBySlug(slug);
    if (!page) {
      throw new NotFoundError('Page', slug);
    }
    return page;
  }

  async getHomepage() {
    return this.repo.findHomepage();
  }

  async getByPageType(pageType: string) {
    return this.repo.findByPageType(pageType);
  }

  async list(filter: PageFilter, pagination: Pagination) {
    return this.repo.findMany(filter, pagination);
  }

  async create(input: CreatePageInput) {
    const slugExists = await this.repo.existsBySlug(input.slug);
    if (slugExists) {
      throw new ConflictError(`Page with slug "${input.slug}" already exists`);
    }

    // If setting as homepage, clear existing homepage first
    if (input.isHomepage) {
      await this.repo.clearHomepage();
    }

    const page = await this.repo.create(input);
    logger.info({ pageId: page.id, slug: page.slug }, 'Page created');

    await this.events.emit(PAGE_EVENTS.CREATED, { page });

    return page;
  }

  async update(id: string, input: UpdatePageInput) {
    if (input.slug) {
      const slugExists = await this.repo.existsBySlug(input.slug, id);
      if (slugExists) {
        throw new ConflictError(`Page with slug "${input.slug}" already exists`);
      }
    }

    // If setting as homepage, clear existing homepage first
    if (input.isHomepage) {
      await this.repo.clearHomepage();
    }

    const page = await this.repo.update(id, input);
    if (!page) {
      throw new NotFoundError('Page', id);
    }

    logger.info({ pageId: page.id }, 'Page updated');
    await this.events.emit(PAGE_EVENTS.UPDATED, { page });

    return page;
  }

  async delete(id: string) {
    const page = await this.repo.findById(id);
    if (!page) {
      throw new NotFoundError('Page', id);
    }

    // System pages cannot be deleted
    if (page.pageType !== 'custom') {
      throw new ConflictError(`System page "${page.title}" cannot be deleted`);
    }

    await this.repo.delete(id);
    logger.info({ pageId: id }, 'Page deleted');

    await this.events.emit(PAGE_EVENTS.DELETED, { page });

    return true;
  }

  async publish(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Page', id);
    }

    const page = await this.repo.publish(id);
    if (!page) {
      throw new NotFoundError('Page', id);
    }

    logger.info({ pageId: page.id, slug: page.slug }, 'Page published');
    await this.events.emit(PAGE_EVENTS.PUBLISHED, { page });

    return page;
  }

  async unpublish(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Page', id);
    }

    const page = await this.repo.unpublish(id);
    if (!page) {
      throw new NotFoundError('Page', id);
    }

    logger.info({ pageId: page.id, slug: page.slug }, 'Page unpublished');
    await this.events.emit(PAGE_EVENTS.UNPUBLISHED, { page });

    return page;
  }

  async duplicate(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Page', id);
    }

    // Generate unique slug with -copy suffix
    let newSlug = `${existing.slug}-copy`;
    let counter = 1;
    while (await this.repo.existsBySlug(newSlug)) {
      counter++;
      newSlug = `${existing.slug}-copy-${counter}`;
    }

    const page = await this.repo.create({
      title: `${existing.title} (Copy)`,
      slug: newSlug,
      status: 'draft',
      content: existing.content,
      seoTitle: existing.seoTitle ?? undefined,
      seoDescription: existing.seoDescription ?? undefined,
      isHomepage: false,
      sortOrder: existing.sortOrder,
    });

    logger.info({ pageId: page.id, sourceId: id, slug: page.slug }, 'Page duplicated');
    await this.events.emit(PAGE_EVENTS.DUPLICATED, { page, sourceId: id });

    return page;
  }
}
