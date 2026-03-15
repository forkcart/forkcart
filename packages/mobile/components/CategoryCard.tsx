import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import type { Category } from '@/lib/api';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/category/${category.id}`)}
      activeOpacity={0.7}
    >
      {category.image ? (
        <Image source={{ uri: category.image }} style={styles.image} contentFit="cover" />
      ) : (
        <Ionicons name="grid-outline" size={28} color={theme.colors.accent} />
      )}
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    minHeight: 100,
    gap: theme.spacing.sm,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
  },
  name: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
