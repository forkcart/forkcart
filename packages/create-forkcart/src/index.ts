#!/usr/bin/env node

import prompts from 'prompts';
import kleur from 'kleur';
import fs from 'fs-extra';
import path from 'path';
import { execSync, spawn } from 'child_process';

const VERSION = '0.1.0';

function banner(): void {
  console.log();
  console.log(kleur.bold().cyan('  🍴 Create ForkCart') + kleur.dim(' — E-Commerce in 5 Minutes'));
  console.log();
}

function printHelp(): void {
  banner();
  console.log('  Usage: create-forkcart [project-name] [options]');
  console.log();
  console.log('  Options:');
  console.log('    --help, -h       Show this help message');
  console.log('    --version, -v    Show version number');
  console.log();
}

function runCommand(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'pipe' });
}

function detectPackageManager(): string {
  const ua = process.env['npm_config_user_agent'] ?? '';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('pnpm')) return 'pnpm';
  return 'pnpm'; // default to pnpm
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    process.exit(0);
  }

  banner();

  const initialName = args.find((a) => !a.startsWith('-'));

  const onCancel = () => {
    console.log(kleur.red('\n  ✖ Setup cancelled.\n'));
    process.exit(1);
  };

  let projectName = initialName;

  if (!projectName) {
    const response = await prompts(
      {
        type: 'text',
        name: 'projectName',
        message: 'Project name',
        initial: 'my-shop',
        validate: (value: string) =>
          /^[a-z0-9_-]+$/i.test(value) ? true : 'Only letters, numbers, hyphens, and underscores',
      },
      { onCancel },
    );
    projectName = response.projectName;
  }

  const targetDir = path.resolve(process.cwd(), projectName!);

  if (await fs.pathExists(targetDir)) {
    const { overwrite } = await prompts(
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${kleur.yellow(projectName!)} already exists. Overwrite?`,
        initial: false,
      },
      { onCancel },
    );

    if (!overwrite) {
      console.log(kleur.red('\n  ✖ Setup cancelled.\n'));
      process.exit(1);
    }

    await fs.remove(targetDir);
  }

  console.log();

  const spin = (msg: string) => process.stdout.write(kleur.cyan(`  ⠋ ${msg}...`));
  const done = (msg: string) => process.stdout.write(`\r${kleur.green(`  ✓ ${msg}    `)}\n`);

  // Step 1: Clone
  try {
    spin('Downloading ForkCart');
    runCommand(
      `git clone --depth 1 https://github.com/forkcart/forkcart.git "${targetDir}"`,
      process.cwd(),
    );
    await fs.remove(path.join(targetDir, '.git'));
    done('Downloaded ForkCart');
  } catch {
    console.log(kleur.red('\n  ✖ Could not download ForkCart. Check your internet connection.\n'));
    process.exit(1);
  }

  // Step 2: Install dependencies
  const pm = detectPackageManager();
  const installCmd = pm === 'yarn' ? 'yarn' : `${pm} install`;

  try {
    spin('Installing dependencies');
    runCommand(installCmd, targetDir);
    done('Installed dependencies');
  } catch {
    console.log(
      kleur.dim(`\n  ⚠ Could not install dependencies. Run ${kleur.cyan(installCmd)} manually.\n`),
    );
  }

  // Step 3: Launch web installer
  console.log();
  console.log(kleur.bold().green('  🚀 Launching setup wizard...'));
  console.log();
  console.log(`  Open ${kleur.underline().cyan('http://localhost:4200')} in your browser`);
  console.log(kleur.dim('  The wizard will configure your database, create an admin account,'));
  console.log(kleur.dim('  and start your store automatically.'));
  console.log();

  const child = spawn(pm, ['installer'], {
    cwd: targetDir,
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', () => {
    console.log(
      kleur.dim(
        `\n  ⚠ Could not start installer. Run ${kleur.cyan(`cd ${projectName} && ${pm} installer`)} manually.\n`,
      ),
    );
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log();
      console.log(kleur.bold().green('  🎉 Your ForkCart store is running!'));
      console.log();
      console.log(`  ${kleur.bold('Store:')}  ${kleur.underline('http://localhost:4200')}`);
      console.log(`  ${kleur.bold('Admin:')}  ${kleur.underline('http://localhost:4200/admin')}`);
      console.log();
    }
  });
}

main().catch((err) => {
  console.error(kleur.red('\n  ✖ An unexpected error occurred:\n'));
  console.error(kleur.dim(`  ${err}`));
  process.exit(1);
});
