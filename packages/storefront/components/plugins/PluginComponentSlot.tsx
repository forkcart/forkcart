/**
 * PluginComponentSlot - Server Component that fetches registered React components
 * for a given slot and renders PluginComponent for each.
 */

import { API_URL } from '@/lib/config';
import { PluginComponent } from './PluginComponent';

export interface PluginComponentSlotProps {
  /** The slot name to render components for (e.g. 'checkout-payment') */
  slotName: string;
  /** Optional: current page identifier for page-specific filtering */
  currentPage?: string;
  /** Optional: additional CSS classes on the wrapper */
  className?: string;
  /** Optional: props to pass to all rendered plugin components */
  sharedProps?: Record<string, unknown>;
}

interface RegisteredComponent {
  pluginName: string;
  name: string;
  slot: string;
  props?: string[];
  order: number;
}

interface ComponentsResponse {
  data: RegisteredComponent[];
}

/** Slugify a plugin name for URL use (matches API slug logic) */
function slugifyPluginName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Fetch registered components for a slot from the API.
 */
async function fetchSlotComponents(
  slotName: string,
  currentPage?: string,
): Promise<RegisteredComponent[]> {
  try {
    const params = new URLSearchParams();
    if (currentPage) params.set('page', currentPage);
    const query = params.toString();

    const res = await fetch(
      `${API_URL}/api/v1/public/plugins/components/${encodeURIComponent(slotName)}${query ? `?${query}` : ''}`,
      { next: { revalidate: 300 } },
    );

    if (!res.ok) return [];

    const json = (await res.json()) as ComponentsResponse;
    return json.data ?? [];
  } catch {
    // Silently fail — missing components shouldn't break the page
    return [];
  }
}

/**
 * PluginComponentSlot - Server Component
 *
 * Fetches which React components plugins have registered for a slot,
 * then renders a <PluginComponent> for each.
 */
export async function PluginComponentSlot({
  slotName,
  currentPage,
  className,
  sharedProps = {},
}: PluginComponentSlotProps) {
  const components = await fetchSlotComponents(slotName, currentPage);

  if (components.length === 0) return null;

  return (
    <div className={className} data-component-slot={slotName}>
      {components.map((comp, index) => (
        <PluginComponent
          key={`${comp.pluginName}-${comp.name}-${index}`}
          pluginSlug={slugifyPluginName(comp.pluginName)}
          componentName={comp.name}
          props={sharedProps}
        />
      ))}
    </div>
  );
}

export default PluginComponentSlot;
