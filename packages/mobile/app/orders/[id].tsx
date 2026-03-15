import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { theme } from '@/theme';
import { getOrder, type Order } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!order) return null;

  const addr = order.shippingAddress;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <OrderStatusBadge status={order.status} />
        </View>
        <Text style={styles.date}>Placed on {new Date(order.createdAt).toLocaleDateString()}</Text>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.item}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.itemImage} contentFit="cover" />
            ) : (
              <View style={[styles.itemImage, styles.itemPlaceholder]} />
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              {item.variant && item.variant.length > 0 && (
                <Text style={styles.itemVariant}>
                  {item.variant.map((v) => v.value).join(' / ')}
                </Text>
              )}
              <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
          </View>
        ))}
      </View>

      {/* Shipping Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        <View style={styles.addressBox}>
          <Text style={styles.addressLine}>
            {addr.firstName} {addr.lastName}
          </Text>
          <Text style={styles.addressLine}>{addr.street}</Text>
          <Text style={styles.addressLine}>
            {addr.postalCode} {addr.city}
          </Text>
          <Text style={styles.addressLine}>{addr.country}</Text>
          {addr.phone && <Text style={styles.addressLine}>{addr.phone}</Text>}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                -{formatPrice(order.discount)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>
              {order.shipping > 0 ? formatPrice(order.shipping) : 'Free'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: theme.spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: theme.font.size.xxl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  date: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
  },
  section: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  itemPlaceholder: {
    backgroundColor: theme.colors.surface,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.medium,
    color: theme.colors.text,
  },
  itemVariant: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
  },
  itemQty: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
  },
  itemPrice: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
  },
  addressBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: 2,
  },
  addressLine: {
    fontSize: theme.font.size.md,
    color: theme.colors.text,
    lineHeight: 22,
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
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
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
});
