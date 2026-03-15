import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useCart } from '@/lib/cart';
import {
  getProduct,
  getProductReviews,
  getRelatedProducts,
  addToWishlist,
  type Product,
  type ProductVariant,
  type Review,
} from '@/lib/api';
import { PriceDisplay } from '@/components/PriceDisplay';
import { VariantPicker } from '@/components/VariantPicker';
import { QuantitySelector } from '@/components/QuantitySelector';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const p = await getProduct(slug);
        setProduct(p);
        if (p.variants.length > 0) setSelectedVariant(p.variants[0]);
        const [rev, rel] = await Promise.all([
          getProductReviews(p.id).catch(() => ({ data: [] })),
          getRelatedProducts(p.id).catch(() => []),
        ]);
        setReviews(rev.data);
        setRelated(rel);
      } catch {
        Alert.alert('Error', 'Product not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const comparePrice = selectedVariant?.compareAtPrice ?? product?.compareAtPrice;

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      await addItem(product.id, quantity, selectedVariant?.id);
      Alert.alert('Added to Cart', `${product.name} added to your cart`);
    } catch {
      Alert.alert('Error', 'Could not add to cart');
    } finally {
      setAddingToCart(false);
    }
  }, [product, quantity, selectedVariant, addItem]);

  const handleWishlist = useCallback(async () => {
    if (!product) return;
    try {
      await addToWishlist(product.id);
      Alert.alert('Saved', 'Added to your wishlist');
    } catch {
      Alert.alert('Error', 'Could not add to wishlist');
    }
  }, [product]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!product) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <FlatList
          data={product.images.length > 0 ? product.images : [{ id: 'placeholder', url: '' }]}
          renderItem={({ item }) => (
            <View style={styles.imageSlide}>
              {item.url ? (
                <Image source={{ uri: item.url }} style={styles.image} contentFit="cover" />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Ionicons name="image-outline" size={64} color={theme.colors.textMuted} />
                </View>
              )}
            </View>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
        />

        <View style={styles.details}>
          {/* Name & Price */}
          <Text style={styles.productName}>{product.name}</Text>
          <PriceDisplay price={currentPrice} compareAtPrice={comparePrice} size="lg" />

          {/* Rating */}
          {product.averageRating != null && product.averageRating > 0 && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(product.averageRating!) ? 'star' : 'star-outline'}
                  size={18}
                  color={theme.colors.star}
                />
              ))}
              <Text style={styles.ratingCount}>({product.reviewCount ?? 0} reviews)</Text>
            </View>
          )}

          {/* Variants */}
          {product.variants.length > 1 && (
            <View style={styles.section}>
              <VariantPicker
                variants={product.variants}
                selectedId={selectedVariant?.id ?? null}
                onSelect={setSelectedVariant}
              />
            </View>
          )}

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quantity</Text>
            <QuantitySelector quantity={quantity} onChange={setQuantity} />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Reviews */}
          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Reviews</Text>
              {reviews.slice(0, 5).map((review) => (
                <View key={review.id} style={styles.review}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.author}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= review.rating ? 'star' : 'star-outline'}
                          size={12}
                          color={theme.colors.star}
                        />
                      ))}
                    </View>
                  </View>
                  {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
                  <Text style={styles.reviewBody}>{review.body}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Related Products */}
          {related.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>You might also like</Text>
              <FlatList
                data={related}
                renderItem={({ item }) => <ProductCard product={item} compact />}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: theme.spacing.md }} />}
              />
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Add to Cart */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Button title="♡" onPress={handleWishlist} variant="outline" style={styles.wishlistBtn} />
        <Button
          title={`Add to Cart · ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(currentPrice * quantity)}`}
          onPress={handleAddToCart}
          loading={addingToCart}
          style={styles.addToCartBtn}
          size="lg"
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gallery: {
    height: SCREEN_WIDTH,
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  details: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  productName: {
    fontSize: theme.font.size.xxl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    lineHeight: 34,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: theme.spacing.xs,
  },
  ratingCount: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  section: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.font.size.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  review: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewTitle: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.medium,
    color: theme.colors.text,
  },
  reviewBody: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  wishlistBtn: {
    width: 52,
    paddingHorizontal: 0,
  },
  addToCartBtn: {
    flex: 1,
  },
});
