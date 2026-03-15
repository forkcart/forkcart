import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { theme } from '@/theme';
import { getCategory, getProducts, type Product, type Category } from '@/lib/api';
import { ProductGrid } from '@/components/ProductGrid';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const cat = await getCategory(id);
        setCategory(cat);
        navigation.setOptions({ title: cat.name });
        const res = await getProducts({ categoryId: id, page: 1, pageSize: 20 });
        setProducts(res.data);
        setHasMore(1 < res.totalPages);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigation]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !id) return;
    const next = page + 1;
    try {
      const res = await getProducts({ categoryId: id, page: next, pageSize: 20 });
      setProducts((prev) => [...prev, ...res.data]);
      setHasMore(next < res.totalPages);
      setPage(next);
    } catch {
      // ignore
    }
  }, [hasMore, loading, page, id]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <View style={styles.container}>
      {category?.description && <Text style={styles.description}>{category.description}</Text>}
      <ProductGrid
        products={products}
        loading={loading}
        onEndReached={loadMore}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products in this category</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  description: {
    fontSize: theme.font.size.md,
    color: theme.colors.textSecondary,
    padding: theme.spacing.md,
    lineHeight: 22,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: theme.font.size.md,
    color: theme.colors.textMuted,
  },
});
