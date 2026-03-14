/** BlockStyles — shared with admin, applied as inline CSS in storefront */
export interface BlockStyles {
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  bgColor?: string;
  textColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  minHeight?: number;
  maxWidth?: number;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  opacity?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const shadowMap: Record<string, string> = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
};

/** Check if a number value was explicitly set (not undefined/null, allows 0) */
function isSet(v: number | undefined | null): v is number {
  return v != null && v !== 0;
}

export function stylesToCSS(s: BlockStyles = {}): React.CSSProperties {
  const css: React.CSSProperties = {};

  // Spacing — use != null to allow explicit 0 values
  if (s.marginTop != null) css.marginTop = s.marginTop;
  if (s.marginBottom != null) css.marginBottom = s.marginBottom;
  if (s.marginLeft != null) css.marginLeft = s.marginLeft;
  if (s.marginRight != null) css.marginRight = s.marginRight;
  if (s.paddingTop != null) css.paddingTop = s.paddingTop;
  if (s.paddingBottom != null) css.paddingBottom = s.paddingBottom;
  if (s.paddingLeft != null) css.paddingLeft = s.paddingLeft;
  if (s.paddingRight != null) css.paddingRight = s.paddingRight;

  // Colors
  if (s.bgColor && s.bgColor !== 'transparent') css.backgroundColor = s.bgColor;
  if (s.textColor) css.color = s.textColor;

  // Border
  if (s.borderStyle && s.borderStyle !== 'none') {
    css.borderStyle = s.borderStyle;
    css.borderWidth = s.borderWidth ?? 1;
    css.borderColor = s.borderColor ?? '#e5e7eb';
  }
  if (isSet(s.borderRadius)) css.borderRadius = s.borderRadius;

  // Typography
  if (isSet(s.fontSize)) css.fontSize = s.fontSize;
  if (s.fontWeight) css.fontWeight = s.fontWeight;
  if (s.textAlign) css.textAlign = s.textAlign;
  if (s.lineHeight) css.lineHeight = s.lineHeight;

  // Dimensions
  if (isSet(s.minHeight)) css.minHeight = s.minHeight;
  if (isSet(s.maxWidth)) css.maxWidth = s.maxWidth;

  // Effects
  if (s.opacity != null && s.opacity < 1) css.opacity = s.opacity;
  if (s.shadow && s.shadow !== 'none') css.boxShadow = shadowMap[s.shadow];

  return css;
}
