import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { mkdir, rm, readFile, writeFile, cp, readdir, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createLogger } from '../lib/logger';
import type { MobileAppConfig } from './repository';

const execFileAsync = promisify(execFile);
const logger = createLogger('native-builder');

const ANDROID_HOME = process.env['ANDROID_HOME'] ?? '/opt/android-sdk';
const JAVA_HOME = process.env['JAVA_HOME'] ?? '/usr/lib/jvm/java-17-openjdk-amd64';

interface BuildResult {
  apkPath: string;
  tmpDir: string;
  size: number;
}

/**
 * Build an Android APK from the Expo project template.
 *
 * Steps:
 * 1. Generate the Expo project (copy template + apply config)
 * 2. Run `npx expo prebuild --platform android` to eject native code
 * 3. Run Gradle `assembleRelease` to compile the APK
 * 4. Return path to the built APK
 */
export async function buildAndroidApk(
  config: MobileAppConfig,
  templatePath: string,
  mediaStoragePath: string,
): Promise<BuildResult> {
  const buildId = randomUUID().slice(0, 8);
  const tmpDir = resolve('/tmp', `forkcart-native-${buildId}`);
  const projectDir = join(tmpDir, 'forkcart-mobile');

  try {
    logger.info({ buildId, appName: config.appName }, 'Starting native Android build');

    // 1. Copy template
    await mkdir(tmpDir, { recursive: true });
    await cp(templatePath, projectDir, {
      recursive: true,
      filter: (src) => {
        const name = src.split('/').pop() ?? '';
        return name !== 'node_modules' && name !== '.expo' && name !== 'android' && name !== 'ios';
      },
    });

    // 2. Apply config (same as generator.ts)
    await applyConfig(projectDir, config, mediaStoragePath);

    // 3. Ensure package.json has required deps for prebuild
    await ensureBuildDeps(projectDir);

    // 4. Install node_modules
    logger.info({ buildId }, 'Installing dependencies');
    await run('npm', ['install', '--legacy-peer-deps'], { cwd: projectDir, timeout: 120_000 });

    // 5. Run expo prebuild for android
    logger.info({ buildId }, 'Running expo prebuild');
    await run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], {
      cwd: projectDir,
      timeout: 120_000,
      env: {
        ...process.env,
        ANDROID_HOME,
        ANDROID_SDK_ROOT: ANDROID_HOME,
        JAVA_HOME,
      },
    });

    // 5b. Patch minSdkVersion to 24 (react-native-screens requires it)
    try {
      // Patch build.gradle
      const buildGradlePath = join(projectDir, 'android', 'build.gradle');
      let buildGradle = await readFile(buildGradlePath, 'utf-8');
      buildGradle = buildGradle.replace(
        /minSdkVersion\s*=\s*.+/g,
        "minSdkVersion = Integer.parseInt(findProperty('android.minSdkVersion') ?: '24')",
      );
      await writeFile(buildGradlePath, buildGradle, 'utf-8');

      // Also set in gradle.properties (CMake reads from here)
      const gradlePropsPath = join(projectDir, 'android', 'gradle.properties');
      let gradleProps = await readFile(gradlePropsPath, 'utf-8');
      if (!gradleProps.includes('android.minSdkVersion')) {
        gradleProps += '\nandroid.minSdkVersion=24\n';
      } else {
        gradleProps = gradleProps.replace(
          /android\.minSdkVersion\s*=\s*\d+/,
          'android.minSdkVersion=24',
        );
      }
      // Disable new architecture to avoid CMake CXX1214 minSdk conflicts
      gradleProps = gradleProps.replace(/newArchEnabled\s*=\s*true/, 'newArchEnabled=false');
      // Pin NDK version to avoid "does not contain platforms" errors
      if (!gradleProps.includes('android.ndkVersion')) {
        gradleProps += '\nandroid.ndkVersion=27.2.12479018\n';
      }
      // Force ALL subprojects to use minSdkVersion 24 for CMake (fixes CXX1214)
      const settingsGradlePath = join(projectDir, 'android', 'settings.gradle');
      try {
        let settingsGradle = await readFile(settingsGradlePath, 'utf-8');
        settingsGradle += `
// Force minSdkVersion 24 for all subprojects (fixes CXX1214 prefab validation)
gradle.afterProject { project ->
    if (project.hasProperty('android')) {
        project.android {
            if (it.hasProperty('defaultConfig')) {
                it.defaultConfig {
                    if (minSdkVersion.apiLevel < 24) {
                        minSdkVersion 24
                    }
                }
            }
        }
    }
}
`;
        await writeFile(settingsGradlePath, settingsGradle, 'utf-8');
      } catch {
        // settings.gradle may not exist
      }
      await writeFile(gradlePropsPath, gradleProps, 'utf-8');

      // Remove externalNativeBuild from react-native-screens to avoid CXX1214
      // With newArch=false, CMake native build is NOT needed
      const rnsGradlePath = join(
        projectDir,
        'node_modules',
        'react-native-screens',
        'android',
        'build.gradle',
      );
      try {
        let rnsGradle = await readFile(rnsGradlePath, 'utf-8');
        // Remove the externalNativeBuild blocks entirely
        rnsGradle = rnsGradle.replace(
          /externalNativeBuild\s*\{[^}]*cmake\s*\{[^}]*\}[^}]*\}/g,
          '// externalNativeBuild removed for server-side build',
        );
        // Also remove prefab
        rnsGradle = rnsGradle.replace(/prefab\s+true/, 'prefab false');
        await writeFile(rnsGradlePath, rnsGradle, 'utf-8');
        logger.info({ buildId }, 'Removed CMake from react-native-screens');
      } catch {
        // Library may not exist
      }

      // Do the same for react-native-reanimated
      const reanimatedGradlePath = join(
        projectDir,
        'node_modules',
        'react-native-reanimated',
        'android',
        'build.gradle',
      );
      try {
        let reanimatedGradle = await readFile(reanimatedGradlePath, 'utf-8');
        reanimatedGradle = reanimatedGradle.replace(
          /externalNativeBuild\s*\{[^}]*cmake\s*\{[^}]*\}[^}]*\}/g,
          '// externalNativeBuild removed for server-side build',
        );
        reanimatedGradle = reanimatedGradle.replace(/prefab\s+true/, 'prefab false');
        await writeFile(reanimatedGradlePath, reanimatedGradle, 'utf-8');
        logger.info({ buildId }, 'Removed CMake from react-native-reanimated');
      } catch {
        // Library may not exist
      }

      logger.info(
        { buildId },
        'Patched minSdkVersion to 24 + disabled newArch in gradle.properties',
      );
    } catch (e) {
      logger.warn({ buildId, e }, 'Could not patch minSdkVersion');
    }

    // 6. Build the APK with Gradle
    const androidDir = join(projectDir, 'android');
    logger.info({ buildId }, 'Building APK with Gradle');
    await run(
      './gradlew',
      [
        'assembleRelease',
        '-x',
        'lint',
        '--no-daemon',
        '-q',
        '-Pandroid.minSdkVersion=24',
        '-PreactNativeArchitectures=arm64-v8a',
      ],
      {
        cwd: androidDir,
        timeout: 600_000, // 10 minutes
        env: {
          ...process.env,
          ANDROID_HOME,
          ANDROID_SDK_ROOT: ANDROID_HOME,
          JAVA_HOME,
          PATH: `${JAVA_HOME}/bin:${ANDROID_HOME}/platform-tools:${process.env['PATH']}`,
        },
      },
    );

    // 7. Find the APK
    const apkDir = join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
    const apkFiles = await readdir(apkDir).catch(() => []);
    const apkFile = apkFiles.find((f) => f.endsWith('.apk'));

    if (!apkFile) {
      throw new Error('APK not found after build. Check build logs.');
    }

    const apkPath = join(apkDir, apkFile);
    const apkStat = await stat(apkPath);

    logger.info({ buildId, apkPath, size: apkStat.size }, 'APK build complete');

    return { apkPath, tmpDir, size: apkStat.size };
  } catch (err) {
    logger.error({ buildId, err }, 'Native build failed');
    // Don't clean up on error so we can debug
    throw err;
  }
}

/** Clean up build artifacts */
export async function cleanupNativeBuild(tmpDir: string): Promise<void> {
  await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
}

/* ─── Helpers ─── */

async function applyConfig(
  projectDir: string,
  config: MobileAppConfig,
  mediaStoragePath: string,
): Promise<void> {
  // Read and update app.json
  const appJsonPath = join(projectDir, 'app.json');
  let appJsonContent: string;
  try {
    appJsonContent = await readFile(appJsonPath, 'utf-8');
  } catch {
    appJsonContent = JSON.stringify(
      { expo: { name: '{{APP_NAME}}', slug: '{{APP_SLUG}}', extra: {} } },
      null,
      2,
    );
  }

  appJsonContent = appJsonContent
    .replace(/\{\{APP_NAME\}\}/g, config.appName)
    .replace(/\{\{APP_SLUG\}\}/g, config.appSlug);

  const appJson = JSON.parse(appJsonContent);
  const expo = appJson.expo ?? appJson;

  expo.name = config.appName;
  expo.slug = config.appSlug;
  expo.version = '1.0.0';

  expo.extra = {
    ...(expo.extra ?? {}),
    apiUrl: config.apiUrl,
    primaryColor: config.primaryColor,
    accentColor: config.accentColor,
    backgroundColor: config.backgroundColor,
  };

  // Android package name
  const androidPackage =
    config.androidPackage || `com.forkcart.${config.appSlug.replace(/-/g, '')}`;
  expo.android = {
    ...(expo.android ?? {}),
    package: androidPackage,
    adaptiveIcon: expo.android?.adaptiveIcon ?? {
      foregroundImage: './assets/icon.png',
      backgroundColor: config.primaryColor,
    },
  };

  if (config.bundleId) {
    expo.ios = { ...(expo.ios ?? {}), bundleIdentifier: config.bundleId };
  }

  await writeFile(appJsonPath, JSON.stringify(appJson, null, 2), 'utf-8');

  // Write theme config
  const themeConfig = `export const theme = {
  primaryColor: '${config.primaryColor}',
  accentColor: '${config.accentColor}',
  backgroundColor: '${config.backgroundColor}',
  appName: '${config.appName.replace(/'/g, "\\'")}',
  apiUrl: '${config.apiUrl}',
};
`;
  await writeFile(join(projectDir, 'theme.config.ts'), themeConfig, 'utf-8');

  // Copy media assets
  if (config.iconMediaId) {
    await copyMediaAsset(mediaStoragePath, config.iconMediaId, projectDir, 'icon.png');
  }
  if (config.splashMediaId) {
    await copyMediaAsset(mediaStoragePath, config.splashMediaId, projectDir, 'splash.png');
  }
}

async function copyMediaAsset(
  mediaStoragePath: string,
  mediaId: string,
  projectDir: string,
  filename: string,
): Promise<void> {
  try {
    const files = await readdir(mediaStoragePath);
    const match = files.find((f) => f.startsWith(mediaId));
    if (match) {
      const assetsDir = join(projectDir, 'assets');
      await mkdir(assetsDir, { recursive: true });
      await cp(join(mediaStoragePath, match), join(assetsDir, filename));
    }
  } catch {
    // Ignore missing media
  }
}

async function ensureBuildDeps(projectDir: string): Promise<void> {
  const pkgPath = join(projectDir, 'package.json');
  const pkgContent = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);

  // Ensure required expo modules for prebuild
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.devDependencies = pkg.devDependencies ?? {};

  // Make sure expo is present
  if (!pkg.dependencies['expo']) {
    pkg.dependencies['expo'] = '~52.0.0';
  }

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
}

async function run(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeout?: number; env?: NodeJS.ProcessEnv },
): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd: opts.cwd,
      timeout: opts.timeout ?? 60_000,
      maxBuffer: 50 * 1024 * 1024, // 50MB
      env: opts.env ?? process.env,
    });
    if (stderr) logger.debug({ cmd, stderr: stderr.slice(0, 500) }, 'stderr output');
    return stdout;
  } catch (err: unknown) {
    const execErr = err as { stderr?: string; stdout?: string; message?: string };
    const msg = execErr.stderr?.slice(-1000) || execErr.message || 'Unknown error';
    logger.error({ cmd, args, error: msg }, 'Command failed');
    throw new Error(`${cmd} ${args[0]} failed: ${msg}`);
  }
}
