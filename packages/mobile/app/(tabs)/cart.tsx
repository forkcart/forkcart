import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/currency';
import { CartItemRow } from '@/components/CartItem';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function CartScreen() {
  const { cart, isLoading, refresh, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const { isAuthenticated } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      await applyCoupon(couponCode.trim());
      setCouponCode('');
    } catch {
      Alert.alert('Error', 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push('/checkout');
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bag-outline" size={64} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Browse products and add items to your cart</Text>
        <Button title="Start Shopping" onPress={() => router.push('/(tabs)/search')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cart.items}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            onUpdateQuantity={(qty) => updateItem(item.id, qty)}
            onRemove={() => removeItem(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.footer}>
            {/* Coupon */}
            <View style={styles.couponRow}>
              {cart.couponCode ? (
                <View style={styles.appliedCoupon}>
                  <Text style={styles.couponLabel}>
                    Coupon: <Text style={styles.couponValue}>{cart.couponCode}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => removeCoupon()}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.couponInput}>
                  <TextInput
                    style={styles.couponField}
                    value={couponCode}
                    onChangeText={setCouponCode}
                    placeholder="Coupon code"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="characters"
                  />
                  <Button
                    title="Apply"
                    onPress={handleApplyCoupon}
                    size="sm"
                    variant="outline"
                    loading={couponLoading}
                  />
                </View>
              )}
            </View>

            {/* Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatPrice(cart.subtotal)}</Text>
              </View>
              {cart.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                    -{formatPrice(cart.discount)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>
                  {cart.shipping > 0 ? formatPrice(cart.shipping) : 'Free'}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(cart.total)}</Text>
              </View>
            </View>
          </View>
        }
      />

      {/* Checkout Button */}
      <View style={styles.checkoutBar}>
        <View style={styles.checkoutTotal}>
          <Text style={styles.checkoutTotalLabel}>Total</Text>
          <Text style={styles.checkoutTotalValue}>{formatPrice(cart.total)}</Text>
        </View>
        <Button title="Checkout" onPress={handleCheckout} size="lg" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: theme.font.size.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  couponRow: {
    paddingVertical: theme.spacing.sm,
  },
  couponInput: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  couponField: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.font.size.md,
    color: theme.colors.text,
  },
  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  couponLabel: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
  },
  couponValue: {
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  summary: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: theme.font.size.md,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.font.size.md,
    color: theme.colors.text,
    fontWeight: theme.font.weight.medium,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  totalLabel: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  checkoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  checkoutTotal: {
    alignItems: 'flex-start',
  },
  checkoutTotalLabel: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textSecondary,
  },
  checkoutTotalValue: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
});
