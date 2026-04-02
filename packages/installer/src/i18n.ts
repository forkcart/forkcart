/**
 * @fileoverview Internationalization strings for the installer
 */

import type { Language } from './types';

type TranslationKey =
  | 'welcome.title'
  | 'welcome.subtitle'
  | 'welcome.language'
  | 'welcome.start'
  | 'systemCheck.title'
  | 'systemCheck.subtitle'
  | 'systemCheck.nodeVersion'
  | 'systemCheck.postgresql'
  | 'systemCheck.diskSpace'
  | 'systemCheck.pnpm'
  | 'systemCheck.passed'
  | 'systemCheck.failed'
  | 'systemCheck.recheck'
  | 'database.title'
  | 'database.subtitle'
  | 'database.host'
  | 'database.port'
  | 'database.username'
  | 'database.password'
  | 'database.name'
  | 'database.createDb'
  | 'database.test'
  | 'database.testing'
  | 'database.success'
  | 'database.error'
  | 'admin.title'
  | 'admin.subtitle'
  | 'admin.email'
  | 'admin.password'
  | 'admin.confirmPassword'
  | 'admin.shopName'
  | 'admin.passwordMismatch'
  | 'admin.passwordTooShort'
  | 'shop.title'
  | 'shop.subtitle'
  | 'shop.currency'
  | 'shop.language'
  | 'shop.demoData'
  | 'shop.demoDataDesc'
  | 'shop.domain'
  | 'shop.domainHint'
  | 'review.title'
  | 'review.subtitle'
  | 'review.database'
  | 'review.admin'
  | 'review.settings'
  | 'review.install'
  | 'install.title'
  | 'install.progress'
  | 'install.step.config'
  | 'install.step.migrations'
  | 'install.step.admin'
  | 'install.step.demo'
  | 'install.step.keys'
  | 'install.step.done'
  | 'success.title'
  | 'success.subtitle'
  | 'success.admin'
  | 'success.storefront'
  | 'success.warning'
  | 'success.credentials'
  | 'nav.back'
  | 'nav.next'
  | 'nav.step';

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  'welcome.title': 'Welcome to ForkCart',
  'welcome.subtitle': "The open-source e-commerce platform. Let's set up your store.",
  'welcome.language': 'Select Language',
  'welcome.start': "Let's go!",
  'systemCheck.title': 'System Check',
  'systemCheck.subtitle': 'Verifying your server meets the requirements.',
  'systemCheck.nodeVersion': 'Node.js ≥ 22',
  'systemCheck.postgresql': 'PostgreSQL reachable',
  'systemCheck.diskSpace': 'Disk Space > 1GB',
  'systemCheck.pnpm': 'pnpm installed',
  'systemCheck.passed': 'All checks passed',
  'systemCheck.failed': 'Some checks failed',
  'systemCheck.recheck': 'Re-check',
  'database.title': 'Database',
  'database.subtitle': 'Configure your PostgreSQL connection.',
  'database.host': 'Host',
  'database.port': 'Port',
  'database.username': 'Username',
  'database.password': 'Password',
  'database.name': 'Database Name',
  'database.createDb': "Create database if it doesn't exist",
  'database.test': 'Test Connection',
  'database.testing': 'Testing...',
  'database.success': 'Connection successful!',
  'database.error': 'Connection failed',
  'admin.title': 'Admin Account',
  'admin.subtitle': 'Create your administrator account.',
  'admin.email': 'Email',
  'admin.password': 'Password',
  'admin.confirmPassword': 'Confirm Password',
  'admin.shopName': 'Shop Name',
  'admin.passwordMismatch': 'Passwords do not match',
  'admin.passwordTooShort': 'Password must be at least 8 characters',
  'shop.title': 'Shop Settings',
  'shop.subtitle': 'Configure your store defaults.',
  'shop.currency': 'Default Currency',
  'shop.language': 'Default Language',
  'shop.demoData': 'Load Demo Data',
  'shop.demoDataDesc': 'Include sample products and categories to get started quickly.',
  'shop.domain': 'Domain / URL',
  'shop.domainHint': 'Optional. Used for CORS and email links.',
  'review.title': 'Review & Install',
  'review.subtitle': 'Please verify your settings before installing.',
  'review.database': 'Database Configuration',
  'review.admin': 'Administrator',
  'review.settings': 'Shop Settings',
  'review.install': 'Install ForkCart',
  'install.title': 'Installing...',
  'install.progress': 'Installation Progress',
  'install.step.config': 'Writing configuration...',
  'install.step.migrations': 'Running database migrations...',
  'install.step.admin': 'Creating admin account...',
  'install.step.demo': 'Loading demo data...',
  'install.step.keys': 'Generating security keys...',
  'install.step.done': 'Done!',
  'success.title': 'ForkCart has been installed!',
  'success.subtitle': 'Your e-commerce store is ready to go.',
  'success.admin': 'Admin Panel',
  'success.storefront': 'Storefront',
  'success.warning': '⚠️ Delete the installer package for security!',
  'success.credentials': 'Your login credentials',
  'nav.back': 'Back',
  'nav.next': 'Next',
  'nav.step': 'Step',
};

const de: Translations = {
  'welcome.title': 'Willkommen bei ForkCart',
  'welcome.subtitle': 'Die Open-Source E-Commerce Plattform. Lass uns deinen Shop einrichten.',
  'welcome.language': 'Sprache wählen',
  'welcome.start': "Los geht's!",
  'systemCheck.title': 'Systemprüfung',
  'systemCheck.subtitle': 'Überprüfe, ob dein Server die Anforderungen erfüllt.',
  'systemCheck.nodeVersion': 'Node.js ≥ 22',
  'systemCheck.postgresql': 'PostgreSQL erreichbar',
  'systemCheck.diskSpace': 'Speicherplatz > 1GB',
  'systemCheck.pnpm': 'pnpm installiert',
  'systemCheck.passed': 'Alle Prüfungen bestanden',
  'systemCheck.failed': 'Einige Prüfungen fehlgeschlagen',
  'systemCheck.recheck': 'Erneut prüfen',
  'database.title': 'Datenbank',
  'database.subtitle': 'Konfiguriere deine PostgreSQL-Verbindung.',
  'database.host': 'Host',
  'database.port': 'Port',
  'database.username': 'Benutzername',
  'database.password': 'Passwort',
  'database.name': 'Datenbankname',
  'database.createDb': 'Datenbank erstellen, falls nicht vorhanden',
  'database.test': 'Verbindung testen',
  'database.testing': 'Teste...',
  'database.success': 'Verbindung erfolgreich!',
  'database.error': 'Verbindung fehlgeschlagen',
  'admin.title': 'Admin-Konto',
  'admin.subtitle': 'Erstelle dein Administrator-Konto.',
  'admin.email': 'E-Mail',
  'admin.password': 'Passwort',
  'admin.confirmPassword': 'Passwort bestätigen',
  'admin.shopName': 'Shop-Name',
  'admin.passwordMismatch': 'Passwörter stimmen nicht überein',
  'admin.passwordTooShort': 'Passwort muss mindestens 8 Zeichen haben',
  'shop.title': 'Shop-Einstellungen',
  'shop.subtitle': 'Konfiguriere die Standardeinstellungen deines Shops.',
  'shop.currency': 'Standardwährung',
  'shop.language': 'Standardsprache',
  'shop.demoData': 'Demo-Daten laden',
  'shop.demoDataDesc': 'Beispielprodukte und Kategorien für einen schnellen Start.',
  'shop.domain': 'Domain / URL',
  'shop.domainHint': 'Optional. Wird für CORS und E-Mail-Links verwendet.',
  'review.title': 'Überprüfen & Installieren',
  'review.subtitle': 'Bitte überprüfe deine Einstellungen vor der Installation.',
  'review.database': 'Datenbank-Konfiguration',
  'review.admin': 'Administrator',
  'review.settings': 'Shop-Einstellungen',
  'review.install': 'ForkCart installieren',
  'install.title': 'Installiere...',
  'install.progress': 'Installationsfortschritt',
  'install.step.config': 'Schreibe Konfiguration...',
  'install.step.migrations': 'Führe Datenbank-Migrationen aus...',
  'install.step.admin': 'Erstelle Admin-Konto...',
  'install.step.demo': 'Lade Demo-Daten...',
  'install.step.keys': 'Generiere Sicherheitsschlüssel...',
  'install.step.done': 'Fertig!',
  'success.title': 'ForkCart wurde installiert!',
  'success.subtitle': 'Dein E-Commerce Shop ist bereit.',
  'success.admin': 'Admin-Panel',
  'success.storefront': 'Storefront',
  'success.warning': '⚠️ Lösche das Installer-Package aus Sicherheitsgründen!',
  'success.credentials': 'Deine Anmeldedaten',
  'nav.back': 'Zurück',
  'nav.next': 'Weiter',
  'nav.step': 'Schritt',
};

const translations: Record<Language, Translations> = { en, de };

/**
 * Get translation for a key in the specified language
 */
export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.en[key] || key;
}

/**
 * Get all translations for a language (for client-side JS)
 */
export function getAllTranslations(lang: Language): Translations {
  return translations[lang];
}
