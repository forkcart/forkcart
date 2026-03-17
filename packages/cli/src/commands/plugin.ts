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
