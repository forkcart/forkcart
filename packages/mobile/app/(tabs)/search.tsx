import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { getProducts, type Product } from '@/lib/api';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string, p: number, append = false) => {
    if (!q.trim()) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getProducts({ search: q, page: p, pageSize: 20 });
      setProducts((prev) => (append ? [...prev, ...res.data] : res.data));
      setHasMore(p < res.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      search(query, 1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    search(query, next, true);
  }, [hasMore, loading, page, query, search]);

  const EmptyState = (
    <View style={styles.empty}>
      <Ionicons name="search" size={48} color={theme.colors.textMuted} />
      <Text style={styles.emptyText}>
        {query.trim() ? 'No products found' : 'Search for products'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} autoFocus />
      </View>
      <ProductGrid
        products={products}
        loading={loading}
        onEndReached={loadMore}
        ListEmptyComponent={!loading ? EmptyState : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.font.size.md,
    color: theme.colors.textMuted,
  },
});
