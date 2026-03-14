'use client';

import { useNode } from '@craftjs/core';
import { stylesToCSS, type BlockStyles } from './style-settings';

/**
 * Wrapper hook — call in any block to get the combined style object.
 * Blocks should spread this onto their outermost div.
 */
export function useBlockStyles(): React.CSSProperties {
  const { styles } = useNode((node) => ({
    styles: (node.data.props.styles ?? {}) as BlockStyles,
  }));
  return stylesToCSS(styles);
}
