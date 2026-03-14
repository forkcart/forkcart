'use client';

import { useNode } from '@craftjs/core';
import { stylesToCSS, type BlockStyles } from './style-settings';

interface StyledBlockProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a block's content with user-defined styles from the `styles` prop.
 * Also handles the Craft.js connect ref.
 */
export function StyledBlock({ children, className }: StyledBlockProps) {
  const {
    connectors: { connect },
    styles,
  } = useNode((node) => ({
    styles: (node.data.props.styles ?? {}) as BlockStyles,
  }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={className}
      style={stylesToCSS(styles)}
    >
      {children}
    </div>
  );
}
