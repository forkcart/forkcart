#!/usr/bin/env node

import prompts from 'prompts';
import kleur from 'kleur';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const VERSION = '0.1.0';

type DatabaseChoice = 'local' | 'docker' | 'supabase';
type PackageManager = 'pnpm' | 'npm' | 'yarn';

interface Options {
  projectName: string;
  database: DatabaseChoice;
  supabaseUrl?: string;
  demoData: boolean;
  packageManager: PackageManager;
}

function generateSecret(length = 48): string {
  return crypto.randomBytes(length).toString('base64url');
}

function generatePassword(length = 16): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

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

function getDatabaseUrl(database: DatabaseChoice, supabaseUrl?: string): string {
  switch (database) {
    case 'local':
    case 'docker':
      return 'postgresql://forkcart:forkcart@localhost:5432/forkcart';
    case 'supabase':
      return supabaseUrl || '';
  }
}

function getInstallCommand(pm: PackageManager): string {
  return pm === 'yarn' ? 'yarn' : `${pm} install`;
}

function runCommand(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'pipe' });
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

  const response = await prompts(
    [
      {
        type: initialName ? null : 'text',
        name: 'projectName',
        message: 'Project name',
        initial: 'my-shop',
        validate: (value: string) =>
          /^[a-z0-9_-]+$/i.test(value) ? true : 'Only letters, numbers, hyphens, and underscores',
      },
      {
        type: 'select',
        name: 'database',
        message: 'Database',
        choices: [
          {
            title: 'PostgreSQL (Docker)',
            description: 'Spin up PostgreSQL in Docker automatically',
            value: 'docker',
          },
          {
            title: 'PostgreSQL (local)',
            description: 'Use an existing local PostgreSQL instance',
            value: 'local',
          },
          {
            title: 'Supabase',
            description: 'Connect to a Supabase project',
            value: 'supabase',
          },
        ],
        initial: 0,
      },
      {
        type: (prev: DatabaseChoice) => (prev === 'supabase' ? 'text' : null),
        name: 'supabaseUrl',
        message: 'Supabase connection string',
        validate: (value: string) =>
          value.startsWith('postgresql://') ? true : 'Must be a valid PostgreSQL connection string',
      },
      {
        type: 'confirm',
        name: 'demoData',
        message: 'Include demo data?',
        initial: true,
      },
      {
        type: 'select',
        name: 'packageManager',
        message: 'Package manager',
        choices: [
          { title: 'pnpm', value: 'pnpm' },
          { title: 'npm', value: 'npm' },
          { title: 'yarn', value: 'yarn' },
        ],
        initial: 0,
      },
    ],
    { onCancel },
  );

  const options: Options = {
    projectName: initialName || response.projectName,
    database: response.database,
    supabaseUrl: response.supabaseUrl,
    demoData: response.demoData,
    packageManager: response.packageManager,
  };

  const targetDir = path.resolve(process.cwd(), options.projectName);

  if (await fs.pathExists(targetDir)) {
    const { overwrite } = await prompts(
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${kleur.yellow(options.projectName)} already exists. Overwrite?`,
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

  // Step 1: Clone ForkCart
  const spinner = (msg: string) => process.stdout.write(kleur.cyan(`  ⠋ ${msg}...`));
  const done = (msg: string) => process.stdout.write(`\r${kleur.green(`  ✓ ${msg}    `)}\n`);
  const fail = (msg: string, err: string) => {
    process.stdout.write(`\r${kleur.red(`  ✖ ${msg}`)}\n`);
    console.error(kleur.dim(`    ${err}`));
  };

  try {
    spinner('Cloning ForkCart');
    runCommand(
      `git clone --depth 1 https://github.com/forkcart/forkcart.git "${targetDir}"`,
      process.cwd(),
    );
    await fs.remove(path.join(targetDir, '.git'));
    runCommand('git init', targetDir);
    done('Cloned ForkCart');
  } catch {
    // Fallback: create from template
    done('Created project from template');
    await fs.ensureDir(targetDir);

    const templateDir = path.join(__dirname, '..', 'templates', 'default');
    if (await fs.pathExists(templateDir)) {
      await fs.copy(templateDir, targetDir);
    }
  }

  // Step 2: Write .env
  try {
    spinner('Configuring environment');
    const dbUrl = getDatabaseUrl(options.database, options.supabaseUrl);
    const envContent = [
      `DATABASE_URL=${dbUrl}`,
      `JWT_SECRET=${generateSecret()}`,
      `ADMIN_EMAIL=admin@example.com`,
      `ADMIN_PASSWORD=${generatePassword()}`,
      `STOREFRONT_URL=http://localhost:3000`,
      `API_URL=http://localhost:4000`,
      `NEXT_PUBLIC_API_URL=http://localhost:4000`,
    ].join('\n');

    await fs.writeFile(path.join(targetDir, '.env'), envContent + '\n');
    done('Configured environment');
  } catch (err) {
    fail('Configuring environment', String(err));
  }

  // Step 3: Write docker-compose.yml if Docker selected
  if (options.database === 'docker') {
    try {
      spinner('Setting up Docker Compose');
      const dockerCompose = `services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: forkcart
      POSTGRES_USER: forkcart
      POSTGRES_PASSWORD: forkcart
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;
      await fs.writeFile(path.join(targetDir, 'docker-compose.yml'), dockerCompose);
      done('Docker Compose configured');
    } catch (err) {
      fail('Setting up Docker Compose', String(err));
    }
  }

  // Step 4: Install dependencies
  try {
    spinner('Installing dependencies');
    runCommand(getInstallCommand(options.packageManager), targetDir);
    done('Installed dependencies');
  } catch {
    console.log(
      kleur.dim(
        `\n  ⚠ Could not install dependencies. Run ${kleur.cyan(getInstallCommand(options.packageManager))} manually.`,
      ),
    );
  }

  // Step 5: Database setup
  if (options.database === 'docker') {
    try {
      spinner('Starting database');
      runCommand('docker compose up -d', targetDir);
      // Wait for PostgreSQL to be ready
      await new Promise((resolve) => setTimeout(resolve, 3000));
      done('Database started');
    } catch {
      console.log(kleur.dim('\n  ⚠ Could not start Docker. Run `docker compose up -d` manually.'));
    }
  }

  // Step 6: Run migrations
  try {
    spinner('Running migrations');
    runCommand(
      `${options.packageManager}${options.packageManager === 'npm' ? ' run' : ''} db:migrate`,
      targetDir,
    );
    done('Migrations complete');
  } catch {
    console.log(kleur.dim('\n  ⚠ Could not run migrations. Run them manually later.'));
  }

  // Step 7: Seed demo data
  if (options.demoData) {
    try {
      spinner('Seeding demo data');
      runCommand(
        `${options.packageManager}${options.packageManager === 'npm' ? ' run' : ''} db:seed`,
        targetDir,
      );
      done('Demo data seeded');
    } catch {
      console.log(kleur.dim('\n  ⚠ Could not seed demo data. Run it manually later.'));
    }
  }

  // Done!
  const pm = options.packageManager;
  const devCmd = pm === 'npm' ? 'npm run dev' : `${pm} dev`;

  console.log();
  console.log(kleur.bold().green('  🎉 Your ForkCart store is ready!'));
  console.log();
  console.log(kleur.cyan(`  cd ${options.projectName}`));
  if (options.database === 'docker') {
    console.log(kleur.dim('  docker compose up -d') + kleur.dim('  # if not already running'));
  }
  console.log(kleur.cyan(`  ${devCmd}`));
  console.log();
  console.log(`  ${kleur.bold('Storefront:')}  ${kleur.underline('http://localhost:3000')}`);
  console.log(`  ${kleur.bold('Admin:')}       ${kleur.underline('http://localhost:3001')}`);
  console.log(`  ${kleur.bold('API:')}         ${kleur.underline('http://localhost:4000')}`);
  console.log();
}

main().catch((err) => {
  console.error(kleur.red('\n  ✖ An unexpected error occurred:\n'));
  console.error(kleur.dim(`  ${err}`));
  process.exit(1);
});
