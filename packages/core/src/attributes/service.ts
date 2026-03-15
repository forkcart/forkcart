import { NotFoundError } from '@forkcart/shared';
import type { AttributeRepository, CreateAttributeData, UpdateAttributeData } from './repository';
import { createLogger } from '../lib/logger';

const logger = createLogger('attribute-service');

export interface AttributeServiceDeps {
  attributeRepository: AttributeRepository;
}

export class AttributeService {
  private readonly repo: AttributeRepository;

  constructor(deps: AttributeServiceDeps) {
    this.repo = deps.attributeRepository;
  }

  async listAll() {
    return this.repo.findAll();
  }

  async getById(id: string) {
    const attr = await this.repo.findById(id);
    if (!attr) throw new NotFoundError('Attribute', id);
    return attr;
  }

  async create(data: CreateAttributeData) {
    const attr = await this.repo.create(data);
    logger.info({ attributeId: attr.id }, 'Attribute created');
    return attr;
  }

  async update(id: string, data: UpdateAttributeData) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Attribute', id);
    const attr = await this.repo.update(id, data);
    logger.info({ attributeId: id }, 'Attribute updated');
    return attr;
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Attribute', id);
    await this.repo.delete(id);
    logger.info({ attributeId: id }, 'Attribute deleted');
  }
}
