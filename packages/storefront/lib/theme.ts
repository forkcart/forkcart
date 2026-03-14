interface ThemeSetting {
  key: string;
  value: string;
  type: string;
  group: string;
}

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

/** Fetch theme settings from the API (server-side, cached for 60s) */
export async function getThemeSettings(): Promise<ThemeSetting[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/theme-settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: ThemeSetting[] };
    return json.data;
  } catch {
    return [];
  }
}

/** Map of theme setting keys to CSS custom property names */
const CSS_VAR_MAP: Record<string, string> = {
  primary: '--fc-primary',
  secondary: '--fc-secondary',
  accent: '--fc-accent',
  background: '--fc-bg',
  text: '--fc-text',
  muted: '--fc-muted',
  headingFont: '--fc-heading-font',
  bodyFont: '--fc-body-font',
  baseFontSize: '--fc-base-font-size',
  headingWeight: '--fc-heading-weight',
  bodyWeight: '--fc-body-weight',
  borderRadius: '--fc-radius',
  containerMaxWidth: '--fc-container-max-width',
  sectionSpacing: '--fc-section-spacing',
  buttonRadius: '--fc-button-radius',
  buttonPaddingX: '--fc-button-padding-x',
  buttonPaddingY: '--fc-button-padding-y',
};

/** Convert theme settings to a CSS string of custom properties on :root */
export function generateThemeCSS(settings: ThemeSetting[]): string {
  if (!settings.length) return '';

  const vars = settings
    .map((s) => {
      const varName = CSS_VAR_MAP[s.key];
      if (!varName) return null;

      // Append px for number types that represent pixel values
      if (s.type === 'number') {
        // Font weights don't get px
        if (s.key === 'headingWeight' || s.key === 'bodyWeight') {
          return `${varName}: ${s.value};`;
        }
        return `${varName}: ${s.value}px;`;
      }

      return `${varName}: ${s.value};`;
    })
    .filter(Boolean)
    .join('\n  ');

  return `:root {\n  ${vars}\n}`;
}
