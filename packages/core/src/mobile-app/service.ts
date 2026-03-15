import { createLogger } from '../lib/logger';
import type { MobileAppRepository, MobileAppConfig, UpdateMobileAppConfig } from './repository';
import { generateMobileProject, cleanupGeneratedProject } from './generator';

const logger = createLogger('mobile-app-service');

export interface MobileAppServiceDeps {
  mobileAppRepository: MobileAppRepository;
  templatePath: string;
  mediaStoragePath: string;
}

export class MobileAppService {
  private readonly repo: MobileAppRepository;
  private readonly templatePath: string;
  private readonly mediaStoragePath: string;

  constructor(deps: MobileAppServiceDeps) {
    this.repo = deps.mobileAppRepository;
    this.templatePath = deps.templatePath;
    this.mediaStoragePath = deps.mediaStoragePath;
  }

  /** Get the current mobile app config */
  async getConfig(): Promise<MobileAppConfig | null> {
    return this.repo.get();
  }

  /** Update the mobile app config (upsert) */
  async updateConfig(data: UpdateMobileAppConfig): Promise<MobileAppConfig> {
    return this.repo.save(data);
  }

  /** Generate a ZIP of the customized Expo project for download */
  async generateProject(): Promise<string> {
    const config = await this.repo.get();
    if (!config) {
      throw new Error('Mobile app not configured. Please save your config first.');
    }

    logger.info({ appName: config.appName }, 'Generating mobile project');
    return generateMobileProject(config, this.templatePath, this.mediaStoragePath);
  }

  /** Clean up a generated ZIP file */
  async cleanupProject(zipPath: string): Promise<void> {
    await cleanupGeneratedProject(zipPath);
  }

  /** Mark a build as ready (called after ZIP generation on the frontend) */
  async triggerBuild(): Promise<{ status: string; message: string }> {
    const config = await this.repo.get();
    if (!config) {
      throw new Error('Mobile app not configured. Please save your config first.');
    }

    await this.repo.updateBuildStatus('ready');

    logger.info({ appName: config.appName }, 'Build completed — project ready for download');
    return {
      status: 'ready',
      message: 'Your mobile app project is ready to download.',
    };
  }

  /** Get the current build status */
  async getBuildStatus(): Promise<{
    status: string | null;
    buildUrl: string | null;
    buildAt: Date | null;
  }> {
    const config = await this.repo.get();
    if (!config) {
      return { status: null, buildUrl: null, buildAt: null };
    }

    return {
      status: config.lastBuildStatus,
      buildUrl: config.lastBuildUrl,
      buildAt: config.lastBuildAt,
    };
  }
}
