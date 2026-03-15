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

  /** Trigger a cloud build (placeholder — sets status to "building") */
  async triggerBuild(): Promise<{ status: string; message: string }> {
    const config = await this.repo.get();
    if (!config) {
      throw new Error('Mobile app not configured. Please save your config first.');
    }

    // For now, just update the status — real EAS integration comes later
    await this.repo.updateBuildStatus('building');

    logger.info({ appName: config.appName }, 'Build triggered (placeholder)');
    return {
      status: 'building',
      message: 'Cloud builds coming soon! For now, download the project and run `eas build`.',
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
