import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { PriceDisplay } from './PriceDisplay';
import type { Product } from '@/lib/api';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const imageUrl = product.thumbnail ?? product.images[0]?.url;

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={() => router.push(`/product/${product.slug}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.imageContainer, compact && styles.imageCompact]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={32} color={theme.colors.textMuted} />
          </View>
        )}
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleText}>Sale</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {product.averageRating != null && product.averageRating > 0 && (
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color={theme.colors.star} />
            <Text style={styles.ratingText}>
              {product.averageRating.toFixed(1)}
              {product.reviewCount ? ` (${product.reviewCount})` : ''}
            </Text>
          </View>
        )}
        <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  cardCompact: {
    width: 160,
    flex: 0,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
  },
  imageCompact: {
    height: 160,
    aspectRatio: undefined,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  saleBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  saleText: {
    color: theme.colors.white,
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
  },
  info: {
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  name: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.colors.text,
    lineHeight: 18,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textSecondary,
  },
});
