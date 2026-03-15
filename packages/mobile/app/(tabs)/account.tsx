import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/Button';
import { getWishlist, removeFromWishlist, type WishlistItem, type Product } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon} size={22} color={danger ? theme.colors.error : theme.colors.text} />
      <Text style={[styles.menuLabel, danger && { color: theme.colors.error }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const { customer, isAuthenticated, isLoading, logout } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      getWishlist()
        .then(setWishlist)
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons name="person-circle-outline" size={80} color={theme.colors.textMuted} />
        <Text style={styles.guestTitle}>Welcome to {config.storeName}</Text>
        <Text style={styles.guestSubtitle}>Sign in to track orders, save wishlists, and more</Text>
        <View style={styles.guestButtons}>
          <Button title="Sign In" onPress={() => router.push('/login')} />
          <Button
            title="Create Account"
            onPress={() => router.push('/register')}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {customer?.firstName?.[0]}
            {customer?.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.name}>
          {customer?.firstName} {customer?.lastName}
        </Text>
        <Text style={styles.email}>{customer?.email}</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem icon="receipt-outline" label="My Orders" onPress={() => router.push('/orders')} />
        <MenuItem
          icon="heart-outline"
          label="Wishlist"
          onPress={() => {
            /* scroll to wishlist section below */
          }}
        />
        <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
      </View>

      {/* Wishlist */}
      {wishlist.length > 0 && (
        <View style={styles.wishlistSection}>
          <Text style={styles.sectionTitle}>My Wishlist</Text>
          <View style={styles.wishlistGrid}>
            {wishlist.map((item) => (
              <View key={item.id} style={styles.wishlistItem}>
                <ProductCard product={item.product} />
              </View>
            ))}
          </View>
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
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  guestTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  guestSubtitle: {
    fontSize: theme.font.size.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  guestButtons: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.font.size.xxl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.white,
  },
  name: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  email: {
    fontSize: theme.font.size.md,
    color: theme.colors.textSecondary,
  },
  menu: {
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: theme.font.size.md,
    color: theme.colors.text,
    fontWeight: theme.font.weight.medium,
  },
  wishlistSection: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  wishlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  wishlistItem: {
    width: '47%',
  },
});
