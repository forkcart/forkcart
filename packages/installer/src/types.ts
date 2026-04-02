/**
 * @fileoverview Type definitions for the ForkCart installer
 */

/** Supported languages for the installer */
export type Language = 'en' | 'de';

/** Supported currencies */
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

/** System check item result */
export interface SystemCheckItem {
  name: string;
  passed: boolean;
  message: string;
  required: boolean;
}

/** Result of system requirements check */
export interface SystemCheckResult {
  nodeVersion: SystemCheckItem;
  postgresql: SystemCheckItem;
  diskSpace: SystemCheckItem;
  pnpm: SystemCheckItem;
  allPassed: boolean;
}

/** Database connection configuration */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  createDatabase: boolean;
  /** Direct connection string (e.g. Supabase). When set, host/port/user/pass/db are ignored. */
  connectionString?: string;
}

/** Admin account configuration */
export interface AdminConfig {
  email: string;
  password: string;
  shopName: string;
}

/** Shop settings configuration */
export interface ShopConfig {
  currency: Currency;
  language: Language;
  loadDemoData: boolean;
  domain?: string;
}

/** Full installation configuration */
export interface InstallConfig {
  database: DatabaseConfig;
  admin: AdminConfig;
  shop: ShopConfig;
}

/** Installation progress step */
export interface InstallStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

/** Installation status response */
export interface InstallStatus {
  currentStep: number;
  totalSteps: number;
  steps: InstallStep[];
  completed: boolean;
  error?: string;
}

/** Database test result */
export interface DatabaseTestResult {
  success: boolean;
  message: string;
  canConnect: boolean;
  databaseExists: boolean;
}
