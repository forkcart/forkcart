import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createCliContext } from '../utils/context.js';

export function registerPluginCommands(program: Command): void {
  const plugin = program.command('plugin').description('Manage ForkCart plugins').alias('p');

  // ─── plugin:list ───────────────────────────────────────────────────────────

  plugin
    .command('list')
    .alias('ls')
    .description('List all installed plugins')
    .option('-a, --active', 'Show only active plugins')
    .option('-j, --json', 'Output as JSON')
    .action(async (options: { active?: boolean; json?: boolean }) => {
      const spinner = ora('Loading plugins...').start();

      try {
        const ctx = await createCliContext();
        const plugins = await ctx.pluginLoader.getAllPlugins();

        spinner.stop();

        const filtered = options.active ? plugins.filter((p) => p.isActive) : plugins;

        if (options.json) {
          console.log(JSON.stringify(filtered, null, 2));
          await ctx.cleanup();
          return;
        }

        if (filtered.length === 0) {
          console.log(chalk.yellow('No plugins found.'));
          await ctx.cleanup();
          return;
        }

        console.log(chalk.bold('\n📦 Installed Plugins\n'));

        for (const p of filtered) {
          const status = p.isActive ? chalk.green('● active') : chalk.gray('○ inactive');
          const source = chalk.dim(`[${p.source}]`);

          console.log(`  ${status}  ${chalk.bold(p.name)} ${chalk.dim(`v${p.version}`)} ${source}`);
          console.log(`         ${chalk.dim(p.description || 'No description')}`);
          console.log(`         ${chalk.dim(`Type: ${p.type} | Author: ${p.author}`)}`);
          console.log();
        }

        await ctx.cleanup();
      } catch (error) {
        spinner.fail('Failed to list plugins');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  // ─── plugin:activate ───────────────────────────────────────────────────────

  plugin
    .command('activate <name>')
    .description('Activate a plugin by name')
    .action(async (name: string) => {
      const spinner = ora(`Activating plugin "${name}"...`).start();

      try {
        const ctx = await createCliContext();
        const plugins = await ctx.pluginLoader.getAllPlugins();

        const targetPlugin = plugins.find(
          (p) =>
            p.name === name ||
            p.name === `forkcart-plugin-${name}` ||
            p.name === `@forkcart/plugin-${name}`,
        );

        if (!targetPlugin) {
          spinner.fail(`Plugin "${name}" not found`);
          console.log(chalk.dim('\nAvailable plugins:'));
          for (const p of plugins) {
            console.log(chalk.dim(`  - ${p.name}`));
          }
          await ctx.cleanup();
          process.exit(1);
        }

        if (targetPlugin.isActive) {
          spinner.info(`Plugin "${targetPlugin.name}" is already active`);
          await ctx.cleanup();
          return;
        }

        await ctx.pluginLoader.activatePlugin(targetPlugin.id);
        spinner.succeed(`Plugin "${targetPlugin.name}" activated successfully`);

        await ctx.cleanup();
      } catch (error) {
        spinner.fail('Failed to activate plugin');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  // ─── plugin:deactivate ─────────────────────────────────────────────────────

  plugin
    .command('deactivate <name>')
    .description('Deactivate a plugin by name')
    .action(async (name: string) => {
      const spinner = ora(`Deactivating plugin "${name}"...`).start();

      try {
        const ctx = await createCliContext();
        const plugins = await ctx.pluginLoader.getAllPlugins();

        const targetPlugin = plugins.find(
          (p) =>
            p.name === name ||
            p.name === `forkcart-plugin-${name}` ||
            p.name === `@forkcart/plugin-${name}`,
        );

        if (!targetPlugin) {
          spinner.fail(`Plugin "${name}" not found`);
          await ctx.cleanup();
          process.exit(1);
        }

        if (!targetPlugin.isActive) {
          spinner.info(`Plugin "${targetPlugin.name}" is already inactive`);
          await ctx.cleanup();
          return;
        }

        await ctx.pluginLoader.deactivatePlugin(targetPlugin.id);
        spinner.succeed(`Plugin "${targetPlugin.name}" deactivated successfully`);

        await ctx.cleanup();
      } catch (error) {
        spinner.fail('Failed to deactivate plugin');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  // ─── plugin:install ────────────────────────────────────────────────────────

  plugin
    .command('install <package>')
    .alias('add')
    .description('Install a plugin from npm')
    .option('--activate', 'Activate the plugin after installation')
    .action(async (packageName: string, options: { activate?: boolean }) => {
      const spinner = ora(`Installing plugin "${packageName}"...`).start();

      try {
        const ctx = await createCliContext();
        const def = await ctx.pluginLoader.installPlugin(packageName);

        if (!def) {
          spinner.fail(`Failed to install or load plugin "${packageName}"`);
          await ctx.cleanup();
          process.exit(1);
        }

        spinner.succeed(`Plugin "${def.name}" v${def.version} installed successfully`);

        if (options.activate) {
          const activateSpinner = ora(`Activating plugin "${def.name}"...`).start();
          const pluginId = await ctx.pluginLoader.ensurePluginInDb(def);
          await ctx.pluginLoader.activatePlugin(pluginId);
          activateSpinner.succeed(`Plugin "${def.name}" activated`);
        }

        await ctx.cleanup();
      } catch (error) {
        spinner.fail('Failed to install plugin');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  // ─── plugin:uninstall ──────────────────────────────────────────────────────

  plugin
    .command('uninstall <package>')
    .alias('remove')
    .description('Uninstall a plugin')
    .action(async (packageName: string) => {
      const spinner = ora(`Uninstalling plugin "${packageName}"...`).start();

      try {
        const ctx = await createCliContext();
        await ctx.pluginLoader.uninstallPlugin(packageName);
        spinner.succeed(`Plugin "${packageName}" uninstalled successfully`);

        await ctx.cleanup();
      } catch (error) {
        spinner.fail('Failed to uninstall plugin');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  // ─── plugin:commands ───────────────────────────────────────────────────────

  plugin
    .command('commands')
    .description('List all available plugin CLI commands')
    .option('-j, --json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      const spinner = ora('Loading plugin commands...').start();

      try {
        const ctx = await createCliContext();
        await ctx.pluginLoader.loadActivePlugins();

        const commands = ctx.pluginLoader.getAllCliCommands();

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(commands, null, 2));
          await ctx.cleanup();
          return;
        }

        if (commands.length === 0) {
          console.log(chalk.yellow('No plugin commands registered.'));
          console.log(chalk.dim('Activate plugins with CLI commands to see them here.'));
          await ctx.cleanup();
          return;
        }

        console.log(chalk.bold('\n🔧 Plugin CLI Commands\n'));

        for (const { key, pluginName, command } of commands) {
          console.log(`  ${chalk.cyan(`forkcart plugin:run ${key}`)}`);
          console.log(`     ${chalk.dim(command.description)}`);
          console.log(`     ${chalk.dim(`Plugin: ${pluginName}`)}`);

          if (command.args && command.args.length > 0) {
            console.log(`     ${chalk.dim('Arguments:')}`);
            for (const arg of command.args) {
              const req = arg.required ? chalk.red('*') : '';
              console.log(`       ${chalk.yellow(arg.name)}${req} - ${chalk.dim(arg.description)}`);
            }
          }

          if (command.options && command.options.length > 0) {
            console.log(`     ${chalk.dim('Options:')}`);
            for (const opt of command.options) {
              const alias = opt.alias ? `-${opt.alias}, ` : '';
              console.log(
                `       ${chalk.yellow(`${alias}--${opt.name}`)} - ${chalk.dim(opt.description)}`,
              );
            }
          }

          console.log();
        }

        await ctx.cleanup();
      } catch (error) {
        spinner.fail('Failed to list commands');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  // ─── plugin:search ──────────────────────────────────────────────────────────

  plugin
    .command('search <query>')
    .description('Search the ForkCart Plugin Store')
    .option('-c, --category <category>', 'Filter by category')
    .option('-t, --type <type>', 'Filter by type')
    .option('-j, --json', 'Output as JSON')
    .action(
      async (query: string, options: { category?: string; type?: string; json?: boolean }) => {
        const spinner = ora(`Searching for "${query}"...`).start();

        try {
          const ctx = await createCliContext();
          const { PluginStoreService } = await import('@forkcart/core');
          const storeService = new PluginStoreService({
            db: ctx.db,
            pluginLoader: ctx.pluginLoader,
          });
          const result = await storeService.listPlugins({
            search: query,
            category: options.category,
            type: options.type,
          });

          spinner.stop();

          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            await ctx.cleanup();
            return;
          }

          if (result.data.length === 0) {
            console.log(chalk.yellow(`No plugins found for "${query}".`));
            await ctx.cleanup();
            return;
          }

          console.log(
            chalk.bold(`\n🔍 Found ${result.pagination.total} plugin(s) for "${query}"\n`),
          );

          for (const p of result.data) {
            const pricing =
              p.pricing === 'free' ? chalk.green('FREE') : chalk.yellow(p.pricing.toUpperCase());
            console.log(`  ${chalk.bold(p.name)} ${chalk.dim(`v${p.version}`)} ${pricing}`);
            console.log(
              `    ${chalk.cyan(p.slug)} — ${chalk.dim(p.shortDescription || p.description || 'No description')}`,
            );
            console.log(
              `    ⬇ ${p.downloads} downloads  ⭐ ${p.rating ?? '0'} (${p.ratingCount} reviews)`,
            );
            console.log();
          }

          await ctx.cleanup();
        } catch (error) {
          spinner.fail('Search failed');
          console.error(chalk.red((error as Error).message));
          process.exit(1);
        }
      },
    );

  // ─── plugin:info ──────────────────────────────────────────────────────────

  plugin
    .command('info <slug>')
    .description('Show detailed info about a plugin from the store')
    .option('-j, --json', 'Output as JSON')
    .action(async (slug: string, options: { json?: boolean }) => {
      const spinner = ora(`Fetching info for "${slug}"...`).start();

      try {
        const ctx = await createCliContext();
        const { PluginStoreService } = await import('@forkcart/core');
        const storeService = new PluginStoreService({
          db: ctx.db,
          pluginLoader: ctx.pluginLoader,
        });
        const plugin = await storeService.getPlugin(slug);

        spinner.stop();

        if (!plugin) {
          console.log(chalk.red(`Plugin "${slug}" not found.`));
          await ctx.cleanup();
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(plugin, null, 2));
          await ctx.cleanup();
          return;
        }

        const pricing =
          plugin.pricing === 'free'
            ? chalk.green('FREE')
            : chalk.yellow(plugin.pricing.toUpperCase());

        console.log(
          chalk.bold(`\n📦 ${plugin.name} ${chalk.dim(`v${plugin.version}`)} ${pricing}\n`),
        );
        console.log(`  ${chalk.dim('Package:')} ${plugin.packageName}`);
        console.log(`  ${chalk.dim('Author:')}  ${plugin.author ?? 'Unknown'}`);
        console.log(`  ${chalk.dim('Type:')}    ${plugin.type}`);
        console.log(`  ${chalk.dim('License:')} ${plugin.license ?? 'N/A'}`);
        console.log(
          `  ${chalk.dim('Stats:')}   ⬇ ${plugin.downloads} downloads  ⭐ ${plugin.rating ?? '0'} (${plugin.ratingCount} reviews)  🔌 ${plugin.activeInstalls} active installs`,
        );

        if (plugin.description) {
          console.log(`\n  ${plugin.description}`);
        }

        if (plugin.versions && (plugin.versions as unknown[]).length > 0) {
          console.log(chalk.bold('\n  Versions:'));
          for (const v of (plugin.versions as Array<{ version: string; changelog?: string }>).slice(0, 5)) {
            console.log(`    ${chalk.dim('•')} v${v.version} ${chalk.dim(v.changelog ?? '')}`);
          }
        }

        if (plugin.repository) {
          console.log(`\n  ${chalk.dim('Repository:')} ${plugin.repository}`);
        }

        console.log();
        await ctx.cleanup();
      } catch (error) {
        spinner.fail('Failed to fetch plugin info');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  // ─── plugin:publish ───────────────────────────────────────────────────────

  plugin
    .command('publish')
    .description('Publish current directory as a plugin to the ForkCart Plugin Store')
    .action(async () => {
      const spinner = ora('Reading package.json...').start();

      try {
        const { readFileSync } = await import('node:fs');
        const { resolve } = await import('node:path');

        const pkgPath = resolve(process.cwd(), 'package.json');
        let pkg: Record<string, unknown>;
        try {
          pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        } catch {
          spinner.fail('No package.json found in current directory');
          process.exit(1);
        }

        const name = pkg['name'] as string;
        const version = pkg['version'] as string;
        const description = pkg['description'] as string | undefined;
        const author =
          typeof pkg['author'] === 'string'
            ? pkg['author']
            : typeof pkg['author'] === 'object' && pkg['author']
              ? (pkg['author'] as Record<string, string>)['name']
              : undefined;

        if (!name || !version) {
          spinner.fail('package.json must have name and version');
          process.exit(1);
        }

        const slug = name
          .replace(/^@[^/]+\//, '')
          .replace(/^forkcart-plugin-/, '')
          .replace(/[^a-z0-9]+/g, '-');

        spinner.text = `Publishing ${name}@${version}...`;

        const ctx = await createCliContext();
        const { PluginStoreService } = await import('@forkcart/core');
        const storeService = new PluginStoreService({
          db: ctx.db,
          pluginLoader: ctx.pluginLoader,
        });

        // Check if plugin already exists
        const existing = await storeService.getPlugin(slug);
        if (existing) {
          // Publish new version
          await storeService.publishVersion(existing.id, {
            version,
            packageName: name,
            changelog: `Release ${version}`,
          });
          spinner.succeed(`Published new version ${version} for ${name}`);
        } else {
          // Submit new plugin
          await storeService.submitPlugin({
            name: name.replace(/^@[^/]+\//, '').replace(/^forkcart-plugin-/, ''),
            slug,
            packageName: name,
            version,
            description: description ?? undefined,
            author: author ?? undefined,
          });
          spinner.succeed(`Submitted ${name}@${version} to the Plugin Store (pending review)`);
        }

        await ctx.cleanup();
      } catch (error) {
        spinner.fail('Failed to publish plugin');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  // ─── plugin:run ────────────────────────────────────────────────────────────

  plugin
    .command('run <command>')
    .description('Run a plugin CLI command (format: pluginName:commandName)')
    .allowUnknownOption()
    .action(async (commandKey: string, _options: unknown, cmd: Command) => {
      const spinner = ora(`Running command "${commandKey}"...`).start();

      try {
        const ctx = await createCliContext();
        await ctx.pluginLoader.loadActivePlugins();

        // Parse remaining arguments
        const rawArgs = cmd.args.slice(1); // Skip the command key itself
        const args: Record<string, unknown> = {};

        // Simple argument parser
        for (let i = 0; i < rawArgs.length; i++) {
          const arg = rawArgs[i];
          if (!arg) continue;

          if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const nextArg = rawArgs[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
              args[key] = nextArg;
              i++;
            } else {
              args[key] = true;
            }
          } else if (arg.startsWith('-')) {
            const key = arg.slice(1);
            const nextArg = rawArgs[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
              args[key] = nextArg;
              i++;
            } else {
              args[key] = true;
            }
          } else {
            // Positional argument
            args[`_${Object.keys(args).filter((k) => k.startsWith('_')).length}`] = arg;
          }
        }

        spinner.stop();

        await ctx.pluginLoader.executeCliCommand(commandKey, args);

        await ctx.cleanup();
      } catch (error) {
        spinner.fail(`Failed to run command "${commandKey}"`);
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
