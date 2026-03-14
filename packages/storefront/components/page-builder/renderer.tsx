import { Suspense } from 'react';
import { RenderContainer } from './blocks/container';
import { RenderHeading } from './blocks/heading';
import { RenderTextBlock } from './blocks/text-block';
import { RenderImageBlock } from './blocks/image-block';
import { RenderButtonBlock } from './blocks/button-block';
import { RenderHero } from './blocks/hero';
import { RenderSpacer } from './blocks/spacer';
import { RenderColumns } from './blocks/columns';
import { RenderProductGrid } from './blocks/product-grid';
import { RenderCategoryGrid } from './blocks/category-grid';
import { RenderFeaturedProduct } from './blocks/featured-product';
import { RenderNewsletter } from './blocks/newsletter';

/**
 * Craft.js serialized node shape
 */
interface CraftNode {
  type: { resolvedName: string } | string;
  props: Record<string, unknown>;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
  isCanvas?: boolean;
  parent?: string;
  displayName?: string;
  custom?: Record<string, unknown>;
  hidden?: boolean;
}

type CraftData = Record<string, CraftNode>;

/**
 * Extracts the resolved component name from a Craft.js node type.
 */
function getResolvedName(node: CraftNode): string {
  if (typeof node.type === 'string') return node.type;
  if (node.type && typeof node.type === 'object' && 'resolvedName' in node.type) {
    return node.type.resolvedName;
  }
  return 'Unknown';
}

/**
 * Recursively renders children node IDs.
 */
function renderChildren(data: CraftData, childIds: string[]): React.ReactNode {
  return childIds.map((id) => <RenderNode key={id} data={data} nodeId={id} />);
}

/**
 * Renders a single Craft.js node and its children.
 * Server-compatible — no Craft.js runtime needed.
 */
function RenderNode({ data, nodeId }: { data: CraftData; nodeId: string }) {
  const node = data[nodeId];
  if (!node || node.hidden) return null;

  const name = getResolvedName(node);
  const props = node.props ?? {};

  // Collect all children: direct nodes + linked nodes (used by Columns)
  const childIds = node.nodes ?? [];
  const linkedNodeIds = node.linkedNodes ? Object.values(node.linkedNodes) : [];
  const allChildIds = [...childIds, ...linkedNodeIds];
  const children = allChildIds.length > 0 ? renderChildren(data, allChildIds) : undefined;

  switch (name) {
    case 'Container':
      return <RenderContainer {...(props as any)}>{children}</RenderContainer>;

    case 'Heading':
      return <RenderHeading {...(props as any)} />;

    case 'TextBlock':
    case 'Text':
      return <RenderTextBlock {...(props as any)} />;

    case 'ImageBlock':
    case 'Image':
      return <RenderImageBlock {...(props as any)} />;

    case 'ButtonBlock':
    case 'Button':
      return <RenderButtonBlock {...(props as any)} />;

    case 'Hero':
      return <RenderHero {...(props as any)} />;

    case 'Spacer':
      return <RenderSpacer {...(props as any)} />;

    case 'Columns':
      return <RenderColumns {...(props as any)}>{children}</RenderColumns>;

    case 'ProductGrid':
      return (
        <Suspense
          fallback={
            <div className="grid animate-pulse grid-cols-4 gap-6">
              {Array.from({ length: (props.limit as number) ?? 4 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-gray-100" />
              ))}
            </div>
          }
        >
          <RenderProductGrid {...(props as any)} />
        </Suspense>
      );

    case 'CategoryGrid':
      return (
        <Suspense
          fallback={
            <div className="grid animate-pulse grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-gray-100" />
              ))}
            </div>
          }
        >
          <RenderCategoryGrid {...(props as any)} />
        </Suspense>
      );

    case 'FeaturedProduct':
      return (
        <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-gray-100" />}>
          <RenderFeaturedProduct {...(props as any)} />
        </Suspense>
      );

    case 'Newsletter':
      return <RenderNewsletter {...(props as any)} />;

    // Fallback for unknown blocks: just render children if any
    default:
      if (children) return <div>{children}</div>;
      return null;
  }
}

/**
 * Page Builder Renderer
 *
 * Takes Craft.js serialized JSON and renders it as pure HTML/React.
 * No Craft.js runtime required — fully server-side renderable.
 */
export function PageRenderer({ content }: { content: unknown }) {
  if (!content || typeof content !== 'object') return null;

  const data = content as CraftData;
  const root = data['ROOT'];
  if (!root) return null;

  const childIds = root.nodes ?? [];
  const linkedNodeIds = root.linkedNodes ? Object.values(root.linkedNodes) : [];
  const allChildIds = [...childIds, ...linkedNodeIds];

  // Render ROOT's own props (Container-like) wrapping its children
  const rootProps = root.props ?? {};
  const rootName = getResolvedName(root);

  // If ROOT is itself a Container, render with its props
  if (rootName === 'Container' || rootName === 'div') {
    return (
      <RenderContainer {...(rootProps as any)}>{renderChildren(data, allChildIds)}</RenderContainer>
    );
  }

  // Otherwise just render children directly
  return <>{renderChildren(data, allChildIds)}</>;
}
