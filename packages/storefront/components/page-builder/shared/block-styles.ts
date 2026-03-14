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
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
};

export function stylesToCSS(s: BlockStyles = {}): React.CSSProperties {
  const css: React.CSSProperties = {};

  if (s.marginTop) css.marginTop = s.marginTop;
  if (s.marginBottom) css.marginBottom = s.marginBottom;
  if (s.marginLeft) css.marginLeft = s.marginLeft;
  if (s.marginRight) css.marginRight = s.marginRight;
  if (s.paddingTop) css.paddingTop = s.paddingTop;
  if (s.paddingBottom) css.paddingBottom = s.paddingBottom;
  if (s.paddingLeft) css.paddingLeft = s.paddingLeft;
  if (s.paddingRight) css.paddingRight = s.paddingRight;

  if (s.bgColor && s.bgColor !== 'transparent') css.backgroundColor = s.bgColor;
  if (s.textColor) css.color = s.textColor;

  if (s.borderStyle && s.borderStyle !== 'none') {
    css.borderStyle = s.borderStyle;
    css.borderWidth = s.borderWidth ?? 1;
    css.borderColor = s.borderColor ?? '#e5e7eb';
  }
  if (s.borderRadius) css.borderRadius = s.borderRadius;

  if (s.fontSize) css.fontSize = s.fontSize;
  if (s.fontWeight) css.fontWeight = s.fontWeight;
  if (s.textAlign) css.textAlign = s.textAlign;
  if (s.lineHeight) css.lineHeight = s.lineHeight;

  if (s.minHeight) css.minHeight = s.minHeight;
  if (s.maxWidth) css.maxWidth = s.maxWidth;
  if (s.opacity != null && s.opacity < 1) css.opacity = s.opacity;
  if (s.shadow && s.shadow !== 'none') css.boxShadow = shadowMap[s.shadow];

  return css;
}
