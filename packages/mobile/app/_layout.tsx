import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { config } from '@/lib/config';
import { theme } from '@/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.white },
            headerTintColor: theme.colors.text,
            headerTitleStyle: { fontWeight: theme.font.weight.semibold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[slug]" options={{ title: '', headerTransparent: true }} />
          <Stack.Screen name="category/[id]" options={{ title: 'Category' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="login" options={{ title: 'Sign In', presentation: 'modal' }} />
          <Stack.Screen
            name="register"
            options={{ title: 'Create Account', presentation: 'modal' }}
          />
          <Stack.Screen name="orders/index" options={{ title: 'My Orders' }} />
          <Stack.Screen name="orders/[id]" options={{ title: 'Order Details' }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
