# Stripe Payments Plugin

Accept credit card payments via Stripe. Supports one-time payments, 3D Secure, and automatic webhook handling.

## Features

- Stripe Payment Element integration
- 3D Secure / SCA support
- Webhook handling for payment events
- Storefront component for checkout UI

## Settings

| Key                    | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `stripeSecretKey`      | Stripe secret key (sk*live*... or sk*test*...)   |
| `stripePublishableKey` | Stripe publishable key for the frontend          |
| `stripeWebhookSecret`  | Signing secret from your Stripe webhook endpoint |

## Storefront Components

This plugin ships a `StripePayment` storefront component that renders the Stripe Payment Element.

### Props

| Prop             | Type                      | Description                  |
| ---------------- | ------------------------- | ---------------------------- |
| `clientSecret`   | `string`                  | Payment intent client secret |
| `publishableKey` | `string`                  | Stripe publishable key       |
| `onSuccess`      | `() => void`              | Called on successful payment |
| `onError`        | `(error: string) => void` | Called on payment error      |
