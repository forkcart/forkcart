import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { config } from '@/lib/config';
import { getProducts, getCategories, type Product, type Category } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { CategoryCard } from '@/components/CategoryCard';
import { SearchBar } from '@/components/SearchBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function HomeScreen() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [featuredRes, newRes, cats] = await Promise.all([
        getProducts({ pageSize: 10, sort: 'popular' }),
        getProducts({ pageSize: 10, sort: 'newest' }),
        getCategories(),
      ]);
      setFeatured(featuredRes.data);
      setNewProducts(newRes.data);
      setCategories(cats);
    } catch {
      // Silently fail — user can pull to refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.searchTouchable}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.8}
        >
          <SearchBar value={search} onChangeText={setSearch} />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.slice(0, 8).map((cat) => (
              <View key={cat.id} style={styles.categoryItem}>
                <CategoryCard category={cat} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Featured Products */}
      {featured.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <FlatList
            data={featured}
            renderItem={({ item }) => <ProductCard product={item} compact />}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            ItemSeparatorComponent={() => <View style={{ width: theme.spacing.md }} />}
          />
        </View>
      )}

      {/* New Arrivals */}
      {newProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Arrivals</Text>
          <FlatList
            data={newProducts}
            renderItem={({ item }) => <ProductCard product={item} compact />}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            ItemSeparatorComponent={() => <View style={{ width: theme.spacing.md }} />}
          />
        </View>
      )}

      <View style={{ height: theme.spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  searchTouchable: {
    pointerEvents: 'none',
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  categoryItem: {
    width: '47%',
  },
  horizontalList: {
    paddingHorizontal: theme.spacing.md,
  },
});
