import Constants from 'expo-constants';

interface ForkcartConfig {
  apiUrl: string;
  storeName: string;
  primaryColor: string;
  accentColor: string;
  currency: string;
  currencyLocale: string;
}

const extra = Constants.expoConfig?.extra?.forkcart as Partial<ForkcartConfig> | undefined;

export const config: ForkcartConfig = {
  apiUrl: extra?.apiUrl ?? 'https://your-forkcart-api.com',
  storeName: extra?.storeName ?? 'My Store',
  primaryColor: extra?.primaryColor ?? '#000000',
  accentColor: extra?.accentColor ?? '#FF6B00',
  currency: extra?.currency ?? 'EUR',
  currencyLocale: extra?.currencyLocale ?? 'de-DE',
};
