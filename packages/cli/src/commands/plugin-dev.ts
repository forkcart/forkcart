import { Command } from 'commander';
import chalk from 'chalk';
import { resolve, join } from 'node:path';
import { watch } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function timestamp(): string {
  return chalk.dim(new Date().toLocaleTimeString('en-GB', { hour12: false }));
}

function log(icon: string, msg: string): void {
  console.log(`${timestamp()} ${icon} ${msg}`);
}

/**
 * Resolve the plugin directory from a slug.
 * Searches data/plugins/<slug>/ for the actual plugin root (with package.json).
 */
async function resolvePluginDir(slug: string): Promise<string | null> {
  const dataPluginsDir = resolve(process.cwd(), 'data', 'plugins');
  const baseDir = join(dataPluginsDir, slug);

  if (!existsSync(baseDir)) return null;

  // Direct: data/plugins/<slug>/package.json
  if (existsSync(join(baseDir, 'package.json'))) return baseDir;

  // Nested: data/plugins/<slug>/forkcart-plugin-<slug>/package.json
  const prefixed = join(baseDir, `forkcart-plugin-${slug}`);
  if (existsSync(join(prefixed, 'package.json'))) return prefixed;

  // Same-name subfolder: data/plugins/<slug>/<slug>/package.json
  const sameName = join(baseDir, slug);
  if (existsSync(join(sameName, 'package.json'))) return sameName;

  // Search for any subfolder with package.json
  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const sub = join(baseDir, entry.name);
        if (existsSync(join(sub, 'package.json'))) return sub;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Build a plugin using esbuild (same logic as the store install).
 * Returns true on success, false on failure.
 */
function buildPlugin(pluginDir: string): boolean {
  const srcEntry = resolve(pluginDir, 'src', 'index.ts');

  if (!existsSync(srcEntry)) {
    log('⚠️', chalk.yellow(`No src/index.ts found in ${pluginDir}`));
    return false;
  }

  // Create definePlugin shim so esbuild can bundle without @forkcart/plugin-sdk installed
  const shimDir = resolve(pluginDir, 'node_modules', '@forkcart', 'plugin-sdk');
  mkdirSync(shimDir, { recursive: true });
  writeFileSync(
    resolve(shimDir, 'index.js'),
    'export function definePlugin(d) { return d; } export function ref() { return "UUID"; } export const coreSchema = {};',
  );
  writeFileSync(
    resolve(shimDir, 'package.json'),
    '{"name":"@forkcart/plugin-sdk","main":"index.js","type":"module"}',
  );

  const distDir = resolve(pluginDir, 'dist');
  mkdirSync(distDir, { recursive: true });

  const outFile = resolve(distDir, 'index.js');

  try {
    execSync(
      `npx esbuild "${srcEntry}" --outfile="${outFile}" --format=esm --platform=node --bundle --external:hono --loader:.ts=ts`,
      { cwd: pluginDir, timeout: 15000, stdio: 'pipe' },
    );
    return true;
  } catch (error) {
    const err = error as { stderr?: Buffer };
    const stderr = err.stderr?.toString() ?? '';
    log('❌', chalk.red('Build failed'));
    if (stderr) {
      // Print esbuild errors with nice formatting
      for (const line of stderr.split('\n').filter(Boolean)) {
        console.log(`   ${chalk.dim(line)}`);
      }
    }
    return false;
  }
}

/**
 * Notify the running ForkCart server to reload the plugin.
 * Tries the admin API endpoint POST /api/v1/plugins/:id/reload.
 */
async function notifyReload(slug: string, apiUrl: string): Promise<boolean> {
  try {
    // First, find the plugin ID by listing all plugins
    const listRes = await fetch(`${apiUrl}/api/v1/plugins`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!listRes.ok) {
      log('⚠️', chalk.yellow(`Server returned ${listRes.status} — is it running?`));
      return false;
    }

    const body = (await listRes.json()) as { data?: Array<{ id: string; name: string }> };
    const plugins = body.data ?? [];

    // Match by slug (normalized name)
    const plugin = plugins.find((p) => {
      const normalized = p.name.toLowerCase().replace(/\s+/g, '-');
      return normalized === slug || p.name === slug;
    });

    if (!plugin) {
      log('⚠️', chalk.yellow(`Plugin "${slug}" not found on server — skip reload`));
      return false;
    }

    // Trigger reload
    const reloadRes = await fetch(`${apiUrl}/api/v1/plugins/${plugin.id}/reload`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });

    if (reloadRes.ok) {
      return true;
    }

    log('⚠️', chalk.yellow(`Reload returned ${reloadRes.status}`));
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      log('⚠️', chalk.yellow('Server not running — bundle built, reload skipped'));
    } else {
      log('⚠️', chalk.yellow(`Reload failed: ${msg}`));
    }
    return false;
  }
}

export function registerPluginDevCommand(program: Command): void {
  program
    .command('plugin:dev <slug>')
    .description('Watch a plugin for changes, rebuild, and hot-reload on the running server')
    .option('-p, --port <port>', 'ForkCart server port', '3000')
    .option('--host <host>', 'ForkCart server host', 'http://localhost')
    .option('--no-reload', 'Only rebuild, skip server reload')
    .action(async (slug: string, options: { port: string; host: string; reload: boolean }) => {
      const apiUrl = `${options.host}:${options.port}`;

      console.log();
      console.log(chalk.bold.cyan('  🔧 ForkCart Plugin Dev Mode'));
      console.log(chalk.dim(`  ─────────────────────────────`));
      console.log(`  ${chalk.dim('Plugin:')}  ${chalk.bold(slug)}`);
      console.log(`  ${chalk.dim('Server:')}  ${apiUrl}`);
      console.log(
        `  ${chalk.dim('Reload:')}  ${options.reload ? chalk.green('on') : chalk.yellow('off')}`,
      );
      console.log();

      // Resolve plugin directory
      const pluginDir = await resolvePluginDir(slug);

      if (!pluginDir) {
        console.log(chalk.red(`  ✖ Plugin "${slug}" not found in data/plugins/${slug}/`));
        console.log(chalk.dim(`\n  Make sure the plugin directory exists with a package.json.`));
        console.log(chalk.dim(`  Example: data/plugins/${slug}/src/index.ts\n`));
        process.exit(1);
      }

      // Read package.json for display
      try {
        const pkg = JSON.parse(await readFile(join(pluginDir, 'package.json'), 'utf-8')) as {
          name?: string;
          version?: string;
        };
        console.log(
          `  ${chalk.dim('Package:')} ${chalk.bold(pkg.name ?? slug)} ${chalk.dim(`v${pkg.version ?? '0.0.0'}`)}`,
        );
        console.log(`  ${chalk.dim('Path:')}    ${pluginDir}`);
        console.log();
      } catch {
        // ignore
      }

      // Initial build
      log('🔨', chalk.cyan('Building plugin...'));
      const startTime = Date.now();
      const success = buildPlugin(pluginDir);

      if (success) {
        const elapsed = Date.now() - startTime;
        log('✅', chalk.green(`Built in ${elapsed}ms`));

        if (options.reload) {
          log('🔄', chalk.cyan('Reloading on server...'));
          const reloaded = await notifyReload(slug, apiUrl);
          if (reloaded) {
            log('✅', chalk.green('Plugin reloaded'));
          }
        }
      }

      // Watch for changes
      const watchDir = existsSync(join(pluginDir, 'src')) ? join(pluginDir, 'src') : pluginDir;

      log('👀', chalk.cyan(`Watching ${chalk.bold(watchDir)} for changes...`));
      console.log(chalk.dim(`\n  Press Ctrl+C to stop.\n`));

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let building = false;

      watch(watchDir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        if (filename.includes('node_modules')) return;
        if (filename.includes('dist/')) return;
        if (!/\.(ts|js|json|mjs)$/.test(filename)) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          if (building) return;
          building = true;

          log('📝', chalk.dim(`Changed: ${filename}`));
          log('🔨', chalk.cyan('Rebuilding...'));

          const buildStart = Date.now();
          const ok = buildPlugin(pluginDir);

          if (ok) {
            const elapsed = Date.now() - buildStart;
            log('✅', chalk.green(`Built in ${elapsed}ms`));

            if (options.reload) {
              log('🔄', chalk.cyan('Reloading on server...'));
              const reloaded = await notifyReload(slug, apiUrl);
              if (reloaded) {
                log('✅', chalk.green('Plugin reloaded'));
              }
            }
          }

          building = false;
        }, 200);
      });

      // Keep process alive
      await new Promise(() => {});
    });
}
