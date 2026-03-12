import { randomUUID } from 'node:crypto';
import { join, extname } from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { NotFoundError, ValidationError } from '@forkcart/shared';
import type { Pagination } from '@forkcart/shared';
import type { MediaRepository, CreateMediaInput } from './repository';
import type { EventBus } from '../plugins/event-bus';
import { MEDIA_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('media-service');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export interface MediaServiceDeps {
  mediaRepository: MediaRepository;
  eventBus: EventBus;
  storagePath: string;
  baseUrl: string;
}

export interface UploadInput {
  file: File | Blob;
  originalName: string;
  alt?: string;
  entityType?: string;
  entityId?: string;
  sortOrder?: number;
}

export class MediaService {
  private readonly repo: MediaRepository;
  private readonly events: EventBus;
  private readonly storagePath: string;
  private readonly baseUrl: string;

  constructor(deps: MediaServiceDeps) {
    this.repo = deps.mediaRepository;
    this.events = deps.eventBus;
    this.storagePath = deps.storagePath;
    this.baseUrl = deps.baseUrl;
  }

  async upload(input: UploadInput) {
    const { file, originalName, alt, entityType, entityId, sortOrder } = input;

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new ValidationError(
        `File type "${file.type}" not allowed. Accepted: jpg, png, webp, gif`,
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File too large. Maximum: 10MB, got: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      );
    }

    // Generate UUID filename
    const ext = MIME_TO_EXT[file.type] ?? extname(originalName);
    const filename = `${randomUUID()}${ext}`;

    // Ensure upload dir exists
    await mkdir(this.storagePath, { recursive: true });

    // Write file to disk
    const filePath = join(this.storagePath, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Store in database
    const createInput: CreateMediaInput = {
      filename,
      originalName,
      mimeType: file.type,
      size: file.size,
      path: `/${filename}`,
      alt,
      entityType,
      entityId,
      sortOrder: sortOrder ?? 0,
    };

    const record = await this.repo.create(createInput);
    logger.info({ mediaId: record.id, filename }, 'Media uploaded');

    await this.events.emit(MEDIA_EVENTS.UPLOADED, { media: record });

    return {
      ...record,
      url: `${this.baseUrl}/${filename}`,
    };
  }

  async getById(id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError('Media', id);
    return {
      ...record,
      url: `${this.baseUrl}${record.path}`,
    };
  }

  async list(pagination: Pagination) {
    const result = await this.repo.findMany(pagination);
    return {
      ...result,
      data: result.data.map((m) => ({
        ...m,
        url: `${this.baseUrl}${m.path}`,
      })),
    };
  }

  async getByEntity(entityType: string, entityId: string) {
    const records = await this.repo.findByEntity(entityType, entityId);
    return records.map((m) => ({
      ...m,
      url: `${this.baseUrl}${m.path}`,
    }));
  }

  async delete(id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError('Media', id);

    // Delete file from disk
    const filePath = join(this.storagePath, record.filename);
    try {
      await unlink(filePath);
    } catch (err) {
      logger.warn({ mediaId: id, filePath, err }, 'Failed to delete file from disk');
    }

    // Delete from DB
    await this.repo.delete(id);
    logger.info({ mediaId: id }, 'Media deleted');

    await this.events.emit(MEDIA_EVENTS.DELETED, { media: record });

    return true;
  }

  async attachToEntity(mediaId: string, entityType: string, entityId: string, sortOrder?: number) {
    const record = await this.repo.findById(mediaId);
    if (!record) throw new NotFoundError('Media', mediaId);

    const updated = await this.repo.update(mediaId, {
      entityType,
      entityId,
      sortOrder: sortOrder ?? 0,
    });

    return updated ? { ...updated, url: `${this.baseUrl}${updated.path}` } : null;
  }

  async reorderMedia(updates: Array<{ id: string; sortOrder: number }>) {
    await this.repo.updateSortOrders(updates);
  }
}
