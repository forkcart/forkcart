#!/usr/bin/env node
import { config } from 'dotenv';
import { Command } from 'commander';
import chalk from 'chalk';
import { registerPluginCommands } from './commands/plugin.js';
import { registerPluginDevCommand } from './commands/plugin-dev.js';

// Load environment variables from .env
config();

const program = new Command();

program
  .name('forkcart')
  .description('ForkCart CLI - Manage your e-commerce platform')
  .version('0.1.0')
  .addHelpText(
    'after',
    `
${chalk.bold('Examples:')}
  ${chalk.cyan('forkcart plugin list')}           List all plugins
  ${chalk.cyan('forkcart plugin activate stripe')} Activate the Stripe plugin
  ${chalk.cyan('forkcart plugin install @forkcart/plugin-seo')}
                                   Install a plugin from npm
  ${chalk.cyan('forkcart plugin commands')}        List available plugin commands
  ${chalk.cyan('forkcart plugin run seo:generate-sitemap')}
                                   Run a plugin CLI command

${chalk.bold('Environment:')}
  DATABASE_URL  PostgreSQL connection string (required)

${chalk.dim('For more information, visit https://forkcart.dev/docs/cli')}
`,
  );

// Register command groups
registerPluginCommands(program);
registerPluginDevCommand(program);

// Parse and execute
program.parse();
