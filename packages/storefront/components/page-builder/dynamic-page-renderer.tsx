import { PageRenderer } from './renderer';

interface DynamicPageRendererProps {
  /** Page Builder content (Craft.js JSON) */
  content: unknown;
  /** The dynamic block type to replace with children */
  dynamicBlockType: string;
  /** The actual dynamic content to inject where the dynamic block is */
  children: React.ReactNode;
  /** Current locale for locale-aware links in PB blocks */
  locale?: string;
}

/**
 * Renders a Page Builder page but replaces a dynamic block placeholder
 * with actual React content (e.g., real cart, real product detail).
 *
 * It renders the PB content in two parts: before and after the dynamic block,
 * with the children injected in between.
 */
export function DynamicPageRenderer({
  content,
  dynamicBlockType,
  children,
  locale,
}: DynamicPageRendererProps) {
  if (!content || typeof content !== 'object') {
    return <>{children}</>;
  }

  const nodes = content as Record<string, CraftNode>;
  const root = nodes['ROOT'];
  if (!root?.nodes) {
    return <>{children}</>;
  }

  // Find the dynamic block node
  const dynamicNodeId = root.nodes.find((nodeId) => {
    const node = nodes[nodeId];
    if (!node?.type) return false;
    const name =
      typeof node.type === 'object' && 'resolvedName' in node.type
        ? node.type.resolvedName
        : typeof node.type === 'string'
          ? node.type
          : '';
    return name === dynamicBlockType;
  });

  if (!dynamicNodeId) {
    // No dynamic block found — render PB content above, then children
    return (
      <>
        <PageRenderer content={content} locale={locale} />
        {children}
      </>
    );
  }

  // Split nodes into before and after the dynamic block
  const idx = root.nodes.indexOf(dynamicNodeId);
  const beforeNodes = root.nodes.slice(0, idx);
  const afterNodes = root.nodes.slice(idx + 1);

  // Create partial content objects for before/after
  const beforeContent = beforeNodes.length > 0 ? createPartialContent(nodes, beforeNodes) : null;
  const afterContent = afterNodes.length > 0 ? createPartialContent(nodes, afterNodes) : null;

  return (
    <>
      {beforeContent && <PageRenderer content={beforeContent} locale={locale} />}
      {children}
      {afterContent && <PageRenderer content={afterContent} locale={locale} />}
    </>
  );
}

interface CraftNode {
  type?: { resolvedName: string } | string;
  props?: Record<string, unknown>;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
  parent?: string;
  displayName?: string;
  isCanvas?: boolean;
}

/** Create a subset of the Craft.js content with only specific root children */
function createPartialContent(
  allNodes: Record<string, CraftNode>,
  childNodeIds: string[],
): Record<string, CraftNode> {
  const partial: Record<string, CraftNode> = {
    ROOT: {
      ...allNodes['ROOT'],
      nodes: childNodeIds,
    },
  };

  // Recursively include all referenced nodes
  function includeNode(id: string) {
    if (partial[id] || !allNodes[id]) return;
    partial[id] = allNodes[id];
    const node = allNodes[id];
    if (node.nodes) {
      node.nodes.forEach(includeNode);
    }
    if (node.linkedNodes) {
      Object.values(node.linkedNodes).forEach(includeNode);
    }
  }

  childNodeIds.forEach(includeNode);
  return partial;
}
