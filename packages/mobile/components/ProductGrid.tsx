import React from 'react';
import { View, FlatList, StyleSheet, type ListRenderItem } from 'react-native';
import { theme } from '@/theme';
import { ProductCard } from './ProductCard';
import { LoadingSpinner } from './ui/LoadingSpinner';
import type { Product } from '@/lib/api';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onEndReached?: () => void;
  numColumns?: number;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
}

export function ProductGrid({
  products,
  loading = false,
  onEndReached,
  numColumns = 2,
  ListHeaderComponent,
  ListEmptyComponent,
}: ProductGridProps) {
  const renderItem: ListRenderItem<Product> = ({ item }) => (
    <View style={styles.item}>
      <ProductCard product={item} />
    </View>
  );

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={loading ? <LoadingSpinner size="small" /> : null}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  row: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  item: {
    flex: 1,
  },
});
