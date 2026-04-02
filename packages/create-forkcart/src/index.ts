#!/usr/bin/env node

import prompts from 'prompts';
import kleur from 'kleur';
import fs from 'fs-extra';
import path from 'path';
import { execSync, spawn } from 'child_process';
import https from 'https';

const VERSION = '0.1.0';
const REPO = 'forkcart/forkcart';

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
  console.log('    --tag <tag>      Use a specific version (e.g. v0.1.0)');
  console.log();
}

function runCommand(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'pipe' });
}

function detectPackageManager(): string {
  const ua = process.env['npm_config_user_agent'] ?? '';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('pnpm')) return 'pnpm';
  return 'pnpm';
}

/** Fetch the latest release tag from GitHub API */
function fetchLatestTag(): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${REPO}/releases/latest`;
    https
      .get(url, { headers: { 'User-Agent': 'create-forkcart' } }, (res) => {
        // Follow redirects
        if (res.statusCode === 302 || res.statusCode === 301) {
          const location = res.headers['location'];
          if (location) {
            https
              .get(location, { headers: { 'User-Agent': 'create-forkcart' } }, (r2) => {
                let data = '';
                r2.on('data', (chunk: Buffer) => (data += chunk));
                r2.on('end', () => {
                  try {
                    resolve(JSON.parse(data).tag_name);
                  } catch {
                    reject(new Error('Could not parse release info'));
                  }
                });
              })
              .on('error', reject);
            return;
          }
        }

        if (res.statusCode === 404) {
          // No releases yet — fall back to main
          resolve('main');
          return;
        }

        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.tag_name || 'main');
          } catch {
            resolve('main');
          }
        });
      })
      .on('error', () => resolve('main'));
  });
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

  // Parse --tag flag
  const tagIdx = args.indexOf('--tag');
  let explicitTag: string | undefined;
  if (tagIdx !== -1 && args[tagIdx + 1]) {
    explicitTag = args[tagIdx + 1];
  }

  const initialName = args.find(
    (a, i) => !a.startsWith('-') && (tagIdx === -1 || i !== tagIdx + 1),
  );

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

  // Step 1: Resolve version
  let tag = explicitTag;
  if (!tag) {
    spin('Checking latest version');
    tag = await fetchLatestTag();
    if (tag === 'main') {
      done('Using development branch (no releases yet)');
    } else {
      done(`Latest version: ${kleur.bold(tag)}`);
    }
  } else {
    console.log(kleur.dim(`  Using version: ${tag}`));
  }

  // Step 2: Clone at specific tag
  try {
    spin('Downloading ForkCart');
    if (tag === 'main') {
      runCommand(
        `git clone --depth 1 https://github.com/${REPO}.git "${targetDir}"`,
        process.cwd(),
      );
    } else {
      runCommand(
        `git clone --depth 1 --branch ${tag} https://github.com/${REPO}.git "${targetDir}"`,
        process.cwd(),
      );
    }
    await fs.remove(path.join(targetDir, '.git'));
    done(`Downloaded ForkCart ${tag}`);
  } catch {
    console.log(kleur.red('\n  ✖ Could not download ForkCart. Check your internet connection.\n'));
    process.exit(1);
  }

  // Step 3: Install dependencies
  const pm = detectPackageManager();
  const installCmd = pm === 'yarn' ? 'yarn' : `${pm} install`;

  try {
    spin('Installing dependencies');
    runCommand(installCmd, targetDir);
    done('Installed dependencies');
  } catch {
    console.log(
      kleur.dim(`\n  ⚠ Could not install deps. Run ${kleur.cyan(installCmd)} manually.\n`),
    );
  }

  // Step 4: Launch web installer
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
