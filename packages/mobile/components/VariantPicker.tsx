import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import type { ProductVariant } from '@/lib/api';

interface VariantPickerProps {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variant: ProductVariant) => void;
}

interface GroupedOptions {
  [attributeName: string]: { value: string; variantIds: string[] }[];
}

export function VariantPicker({ variants, selectedId, onSelect }: VariantPickerProps) {
  // Group options by attribute name
  const groups: GroupedOptions = {};
  for (const variant of variants) {
    for (const opt of variant.options) {
      if (!groups[opt.name]) groups[opt.name] = [];
      const existing = groups[opt.name].find((o) => o.value === opt.value);
      if (existing) {
        existing.variantIds.push(variant.id);
      } else {
        groups[opt.name].push({ value: opt.value, variantIds: [variant.id] });
      }
    }
  }

  const selected = variants.find((v) => v.id === selectedId);

  return (
    <View style={styles.container}>
      {Object.entries(groups).map(([name, options]) => (
        <View key={name} style={styles.group}>
          <Text style={styles.label}>{name}</Text>
          <View style={styles.options}>
            {options.map((opt) => {
              const isActive = selected?.options.some(
                (o) => o.name === name && o.value === opt.value,
              );
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.option, isActive && styles.optionActive]}
                  onPress={() => {
                    const target = variants.find((v) => opt.variantIds.includes(v.id));
                    if (target) onSelect(target);
                  }}
                >
                  <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                    {opt.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  group: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  option: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    minWidth: 48,
    alignItems: 'center',
  },
  optionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  optionText: {
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    fontWeight: theme.font.weight.medium,
  },
  optionTextActive: {
    color: theme.colors.white,
  },
});
