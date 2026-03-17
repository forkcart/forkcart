import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/theme';
import { useCart } from '@/lib/cart';
import { placeOrderViaPayment, type Address } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function CheckoutScreen() {
  const { cart, refresh } = useCart();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<Address>({
    firstName: '',
    lastName: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  });

  const updateField = (field: keyof Address, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    const required: (keyof Address)[] = [
      'firstName',
      'lastName',
      'street',
      'city',
      'postalCode',
      'country',
    ];
    const missing = required.filter((f) => !address[f]?.trim());
    if (missing.length > 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!cart?.id) {
      Alert.alert('Error', 'No cart found. Please add items first.');
      return;
    }

    setLoading(true);
    try {
      const result = await placeOrderViaPayment({
        cartId: cart.id,
        customerEmail: address.phone || 'guest@forkcart.app', // TODO: add email field
        shippingAddress: {
          firstName: address.firstName,
          lastName: address.lastName,
          addressLine1: address.street,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
        },
      });
      await refresh();
      Alert.alert(
        'Order Placed! 🎉',
        `Your order #${result.orderNumber} has been placed successfully.`,
        [
          {
            text: 'Continue Shopping',
            onPress: () => router.replace('/(tabs)'),
          },
        ],
      );
    } catch {
      Alert.alert('Error', 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Button title="Continue Shopping" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Shipping Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Input
              label="First Name *"
              value={address.firstName}
              onChangeText={(v) => updateField('firstName', v)}
              autoComplete="given-name"
            />
          </View>
          <View style={styles.nameField}>
            <Input
              label="Last Name *"
              value={address.lastName}
              onChangeText={(v) => updateField('lastName', v)}
              autoComplete="family-name"
            />
          </View>
        </View>
        <Input
          label="Street Address *"
          value={address.street}
          onChangeText={(v) => updateField('street', v)}
          autoComplete="street-address"
        />
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Input
              label="City *"
              value={address.city}
              onChangeText={(v) => updateField('city', v)}
              autoComplete="postal-address-locality"
            />
          </View>
          <View style={styles.nameField}>
            <Input
              label="Postal Code *"
              value={address.postalCode}
              onChangeText={(v) => updateField('postalCode', v)}
              autoComplete="postal-code"
            />
          </View>
        </View>
        <Input
          label="Country *"
          value={address.country}
          onChangeText={(v) => updateField('country', v)}
          autoComplete="country-name"
        />
        <Input
          label="Phone"
          value={address.phone ?? ''}
          onChangeText={(v) => updateField('phone', v)}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentBox}>
          <Text style={styles.paymentLabel}>💵 Pay on Delivery</Text>
          <Text style={styles.paymentNote}>More payment methods coming soon</Text>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summary}>
          {cart.items.map((item) => (
            <View key={item.id} style={styles.summaryItem}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name} × {item.quantity}
              </Text>
              <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(cart.subtotal)}</Text>
          </View>
          {cart.discount > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                -{formatPrice(cart.discount)}
              </Text>
            </View>
          )}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>
              {cart.shipping > 0 ? formatPrice(cart.shipping) : 'Free'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(cart.total)}</Text>
          </View>
        </View>
      </View>

      {/* Place Order */}
      <View style={styles.placeOrderSection}>
        <Button title="Place Order" onPress={handlePlaceOrder} loading={loading} size="lg" />
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.font.size.lg,
    color: theme.colors.textMuted,
  },
  section: {
    padding: theme.spacing.md,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  nameField: {
    flex: 1,
  },
  paymentBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  paymentLabel: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
  },
  paymentNote: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
  },
  summary: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.md,
  },
  itemPrice: {
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    fontWeight: theme.font.weight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
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
  placeOrderSection: {
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
});
