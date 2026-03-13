export interface I18nConfig {
  defaultLocale: string;
  supportedLocales: string[];
  fallbackLocale: string;
}

export const DEFAULT_I18N_CONFIG: I18nConfig = {
  defaultLocale: 'en',
  supportedLocales: ['en', 'de'],
  fallbackLocale: 'en',
};
