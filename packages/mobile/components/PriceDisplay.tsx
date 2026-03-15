import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { formatPrice } from '@/lib/currency';

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({ price, compareAtPrice, size = 'md' }: PriceDisplayProps) {
  const hasDiscount = compareAtPrice && compareAtPrice > price;

  return (
    <View style={styles.container}>
      <Text style={[styles.price, styles[`price_${size}`]]}>{formatPrice(price)}</Text>
      {hasDiscount && (
        <Text style={[styles.comparePrice, styles[`compare_${size}`]]}>
          {formatPrice(compareAtPrice)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  price: {
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  price_sm: { fontSize: theme.font.size.sm },
  price_md: { fontSize: theme.font.size.lg },
  price_lg: { fontSize: theme.font.size.xl },
  comparePrice: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  compare_sm: { fontSize: theme.font.size.xs },
  compare_md: { fontSize: theme.font.size.sm },
  compare_lg: { fontSize: theme.font.size.md },
});
