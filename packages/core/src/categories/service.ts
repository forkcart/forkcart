import type { CreateCategoryInput, UpdateCategoryInput } from '@forkcart/shared';
import { NotFoundError, ConflictError, ValidationError } from '@forkcart/shared';
import type { CategoryRepository } from './repository.js';
import type { EventBus } from '../plugins/event-bus.js';
import { CATEGORY_EVENTS } from './events.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('category-service');

/** Dependencies injected into the category service */
export interface CategoryServiceDeps {
  categoryRepository: CategoryRepository;
  eventBus: EventBus;
}

/** Category service — pure business logic */
export class CategoryService {
  private readonly repo: CategoryRepository;
  private readonly events: EventBus;

  constructor(deps: CategoryServiceDeps) {
    this.repo = deps.categoryRepository;
    this.events = deps.eventBus;
  }

  async getById(id: string) {
    const category = await this.repo.findById(id);
    if (!category) {
      throw new NotFoundError('Category', id);
    }
    return category;
  }

  async getBySlug(slug: string) {
    const category = await this.repo.findBySlug(slug);
    if (!category) {
      throw new NotFoundError('Category', slug);
    }
    return category;
  }

  async listAll(activeOnly = false) {
    return this.repo.findAll(activeOnly);
  }

  /** Get root categories (top-level, no parent) */
  async listRoots(activeOnly = false) {
    return this.repo.findRoots(activeOnly);
  }

  /** Build a full category tree from root categories */
  async getTree(activeOnly = true) {
    return this.repo.findRoots(activeOnly);
  }

  async create(input: CreateCategoryInput) {
    const slugExists = await this.repo.existsBySlug(input.slug);
    if (slugExists) {
      throw new ConflictError(`Category with slug "${input.slug}" already exists`);
    }

    if (input.parentId) {
      const parent = await this.repo.findById(input.parentId);
      if (!parent) {
        throw new ValidationError('Parent category does not exist', {
          parentId: input.parentId,
        });
      }
    }

    const category = await this.repo.create(input);
    logger.info({ categoryId: category.id, slug: category.slug }, 'Category created');

    await this.events.emit(CATEGORY_EVENTS.CREATED, { category });
    return category;
  }

  async update(id: string, input: UpdateCategoryInput) {
    if (input.slug) {
      const slugExists = await this.repo.existsBySlug(input.slug, id);
      if (slugExists) {
        throw new ConflictError(`Category with slug "${input.slug}" already exists`);
      }
    }

    if (input.parentId === id) {
      throw new ValidationError('A category cannot be its own parent');
    }

    const category = await this.repo.update(id, input);
    if (!category) {
      throw new NotFoundError('Category', id);
    }

    logger.info({ categoryId: category.id }, 'Category updated');
    await this.events.emit(CATEGORY_EVENTS.UPDATED, { category });

    return category;
  }

  async delete(id: string) {
    const category = await this.repo.findById(id);
    if (!category) {
      throw new NotFoundError('Category', id);
    }

    const hasChildren = await this.repo.hasChildren(id);
    if (hasChildren) {
      throw new ValidationError('Cannot delete a category that has child categories', {
        categoryId: id,
      });
    }

    await this.repo.delete(id);
    logger.info({ categoryId: id }, 'Category deleted');
    await this.events.emit(CATEGORY_EVENTS.DELETED, { category });

    return true;
  }
}
