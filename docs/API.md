# ForkCart API Reference

> Internal reference for sub-agents. All endpoints prefixed with `/api/v1/`.

---

## ⚠️ IMPORTANT: Storefront Checkout Flow

**The web storefront creates orders via `POST /api/v1/payments/demo-complete` (PUBLIC).**
**NOT via `POST /api/v1/orders` (ADMIN-only).**

The checkout flow is:

1. Cart → `POST /carts` or `/carts/quick`
2. Checkout → `POST /payments/demo-complete` with cart ID + customer + shipping address
3. Order is created automatically by the payment service

`POST /orders` is for admin manual order creation only.

---

## Auth Rules Summary

| Path Pattern                  | Auth                                       |
| ----------------------------- | ------------------------------------------ |
| `storefront/*`                | PUBLIC (customer-auth middleware for some) |
| `carts/*`                     | PUBLIC (session-based)                     |
| `customer-auth/*`             | PUBLIC                                     |
| `public/*`                    | PUBLIC                                     |
| `search` GET (not analytics)  | PUBLIC                                     |
| `payments/*`                  | PUBLIC                                     |
| `shipping/methods` GET        | PUBLIC                                     |
| `chat/*` (not `chat/admin/*`) | PUBLIC                                     |
| `products` GET                | PUBLIC                                     |
| `categories` GET              | PUBLIC                                     |
| `pages` GET                   | PUBLIC                                     |
| `theme-settings` GET          | PUBLIC                                     |
| Everything else               | 🔒 ADMIN (Bearer token)                    |

---

## 1. Auth (Admin)

Base: `/api/v1/auth`

| Method | Path      | Auth     | Description                 |
| ------ | --------- | -------- | --------------------------- |
| POST   | `/login`  | PUBLIC   | Login with email + password |
| POST   | `/logout` | 🔒 ADMIN | Invalidate current session  |
| GET    | `/me`     | 🔒 ADMIN | Get current admin user      |

**POST /login**

```json
{ "email": "string", "password": "string" }
→ { "data": { "user": {...}, "token": "string", "expiresAt": "ISO8601" } }
```

---

## 2. Customer Auth (Storefront)

Base: `/api/v1/customer-auth` — all PUBLIC (no admin auth; some routes use customer JWT)

| Method | Path               | Auth            | Description            |
| ------ | ------------------ | --------------- | ---------------------- |
| POST   | `/register`        | PUBLIC          | Register new customer  |
| POST   | `/login`           | PUBLIC          | Customer login         |
| GET    | `/me`              | 🔑 Customer JWT | Get profile            |
| PUT    | `/me`              | 🔑 Customer JWT | Update profile         |
| PUT    | `/password`        | 🔑 Customer JWT | Change password        |
| POST   | `/forgot-password` | PUBLIC          | Request password reset |

**POST /register**

```json
{ "email": "string", "password": "string (min 8)", "firstName": "string", "lastName": "string" }
```

**POST /login**

```json
{ "email": "string", "password": "string" }
```

**PUT /me**

```json
{ "firstName?": "string", "lastName?": "string", "email?": "string", "phone?": "string" }
```

---

## 3. Products

Base: `/api/v1/products`

| Method | Path   | Auth                        | Description                           |
| ------ | ------ | --------------------------- | ------------------------------------- |
| GET    | `/`    | PUBLIC                      | List products (filterable, paginated) |
| GET    | `/:id` | PUBLIC                      | Get by ID or slug                     |
| POST   | `/`    | 🔒 ADMIN                    | Create product                        |
| PUT    | `/:id` | 🔒 ADMIN                    | Update product                        |
| DELETE | `/:id` | 🔒 ADMIN (admin/superadmin) | Delete product                        |

**GET / query params:** `?name=&status=&categoryId=&minPrice=&maxPrice=&page=1&limit=20&locale=de`

**POST / (CreateProductSchema)**

```json
{
  "name": "string",
  "slug?": "string",
  "description?": "string",
  "shortDescription?": "string",
  "sku?": "string",
  "price": 1999,
  "compareAtPrice?": 2499,
  "currency?": "EUR",
  "status?": "draft|active|archived",
  "categoryId?": "uuid",
  "inventoryQuantity?": 0,
  "weight?": 0
}
```

### Product Images

| Method | Path                   | Auth     | Description                        |
| ------ | ---------------------- | -------- | ---------------------------------- |
| POST   | `/:id/images`          | 🔒 ADMIN | Upload image (multipart, 10MB max) |
| GET    | `/:id/images`          | 🔒 ADMIN | List product images                |
| POST   | `/:id/images/:mediaId` | 🔒 ADMIN | Attach existing media              |
| PUT    | `/:id/images/reorder`  | 🔒 ADMIN | Reorder images                     |
| DELETE | `/:id/images/:mediaId` | 🔒 ADMIN | Remove image                       |

### Product Translations

| Method | Path                                       | Auth     | Description                  |
| ------ | ------------------------------------------ | -------- | ---------------------------- |
| GET    | `/:id/translations`                        | 🔒 ADMIN | All translations for product |
| GET    | `/:id/translations/:locale`                | 🔒 ADMIN | Single translation           |
| PUT    | `/:id/translations/:locale`                | 🔒 ADMIN | Upsert translation           |
| DELETE | `/:id/translations/:locale`                | 🔒 ADMIN | Delete translation           |
| POST   | `/:id/translations/:locale/auto-translate` | 🔒 ADMIN | AI auto-translate            |

**PUT /:id/translations/:locale**

```json
{
  "name?": "string|null",
  "description?": "string|null",
  "shortDescription?": "string|null",
  "metaTitle?": "string|null",
  "metaDescription?": "string|null"
}
```

### Product Variants

Base: `/api/v1/products/:productId/variants`

| Method | Path                              | Auth     | Description              |
| ------ | --------------------------------- | -------- | ------------------------ |
| GET    | `/:productId/variants`            | 🔒 ADMIN | List variants            |
| GET    | `/:productId/variants/:variantId` | 🔒 ADMIN | Get variant              |
| POST   | `/:productId/variants`            | 🔒 ADMIN | Create variant           |
| PUT    | `/:productId/variants/bulk`       | 🔒 ADMIN | Bulk update              |
| POST   | `/:productId/variants/generate`   | 🔒 ADMIN | Generate from attributes |
| PUT    | `/:productId/variants/:variantId` | 🔒 ADMIN | Update variant           |
| DELETE | `/:productId/variants/:variantId` | 🔒 ADMIN | Delete variant           |
| DELETE | `/:productId/variants`            | 🔒 ADMIN | Delete all variants      |

**POST /:productId/variants**

```json
{
  "name": "string",
  "sku?": "string",
  "price?": 1999,
  "inventoryQuantity?": 0,
  "attributes?": { "color": "red" },
  "sortOrder?": 0
}
```

**POST /:productId/variants/generate**

```json
{
  "attributeSelections": [
    { "name": "Color", "values": ["Red", "Blue"] },
    { "name": "Size", "values": ["S", "M", "L"] }
  ]
}
```

### Product Reviews

| Method | Path                           | Auth            | Description                       |
| ------ | ------------------------------ | --------------- | --------------------------------- |
| GET    | `/products/:productId/reviews` | PUBLIC          | Approved reviews + average rating |
| POST   | `/products/:productId/reviews` | 🔑 Customer JWT | Submit review                     |

**POST /products/:productId/reviews**

```json
{ "rating": 1-5, "title?": "string", "content?": "string" }
```

---

## 4. Categories

Base: `/api/v1/categories`

| Method | Path    | Auth                        | Description                                        |
| ------ | ------- | --------------------------- | -------------------------------------------------- |
| GET    | `/`     | PUBLIC                      | List all (optional `?active=true&withCounts=true`) |
| GET    | `/tree` | PUBLIC                      | Category tree (nested)                             |
| GET    | `/:id`  | PUBLIC                      | Get by ID or slug                                  |
| POST   | `/`     | 🔒 ADMIN                    | Create category                                    |
| PUT    | `/:id`  | 🔒 ADMIN                    | Update category                                    |
| DELETE | `/:id`  | 🔒 ADMIN (admin/superadmin) | Delete category                                    |

**POST /**

```json
{
  "name": "string",
  "slug?": "string",
  "description?": "string",
  "parentId?": "uuid",
  "sortOrder?": 0,
  "isActive?": true,
  "imageUrl?": "string"
}
```

---

## 5. Cart

Base: `/api/v1/carts` — all PUBLIC (session-based)

| Method | Path                 | Auth   | Description                               |
| ------ | -------------------- | ------ | ----------------------------------------- |
| POST   | `/quick`             | PUBLIC | Create cart with items + get checkout URL |
| POST   | `/`                  | PUBLIC | Create empty cart                         |
| GET    | `/:id`               | PUBLIC | Get cart                                  |
| POST   | `/:id/items`         | PUBLIC | Add item                                  |
| PUT    | `/:id/items/:itemId` | PUBLIC | Update item quantity                      |
| DELETE | `/:id/items/:itemId` | PUBLIC | Remove item                               |
| DELETE | `/:id`               | PUBLIC | Clear cart                                |
| PATCH  | `/:id/assign`        | PUBLIC | Assign cart to customer                   |

**POST /quick**

```json
{
  "items": [{ "productId": "uuid", "quantity": 1, "variantId?": "uuid" }],
  "sessionId?": "string"
}
→ { "data": { ...cart, "checkoutUrl": "/checkout?cartId=uuid" } }
```

**POST /**

```json
{ "sessionId?": "string", "customerId?": "uuid" }
```

**POST /:id/items**

```json
{ "productId": "uuid", "quantity": 1, "variantId?": "uuid" }
```

---

## 6. Payments / Checkout

Base: `/api/v1/payments` — all PUBLIC

| Method   | Path                 | Auth       | Description                                            |
| -------- | -------------------- | ---------- | ------------------------------------------------------ |
| GET      | `/providers`         | PUBLIC     | List active payment providers                          |
| POST     | `/create-intent`     | PUBLIC     | Create payment intent (Stripe etc.)                    |
| **POST** | **`/demo-complete`** | **PUBLIC** | **Complete demo/prepayment order — CREATES THE ORDER** |
| GET      | `/:id`               | PUBLIC     | Get payment by ID                                      |

### Webhooks (separate mount)

| Method | Path                    | Auth                        | Description              |
| ------ | ----------------------- | --------------------------- | ------------------------ |
| POST   | `/webhooks/:providerId` | PUBLIC (signature verified) | Payment provider webhook |

**POST /demo-complete** ⭐ Main checkout endpoint

```json
{
  "cartId": "uuid",
  "customerEmail": "email",
  "shippingAddress": {
    "firstName": "string", "lastName": "string",
    "addressLine1": "string", "city": "string",
    "postalCode": "string", "country": "DE"
  }
}
→ { "data": { order details } }
```

**POST /create-intent** (for real payment providers)

```json
{
  "cartId": "uuid",
  "providerId": "stripe",
  "customer": { "email": "string", "firstName": "string", "lastName": "string" },
  "shippingAddress": {
    "firstName": "string",
    "lastName": "string",
    "addressLine1": "string",
    "city": "string",
    "postalCode": "string",
    "country": "DE"
  }
}
```

---

## 7. Orders (Admin)

Base: `/api/v1/orders` — 🔒 ALL ADMIN

| Method | Path          | Auth     | Description                         |
| ------ | ------------- | -------- | ----------------------------------- |
| GET    | `/stats`      | 🔒 ADMIN | Order statistics                    |
| GET    | `/`           | 🔒 ADMIN | List orders (filterable, paginated) |
| GET    | `/:id`        | 🔒 ADMIN | Get order by ID                     |
| POST   | `/`           | 🔒 ADMIN | Create order manually               |
| PUT    | `/:id/status` | 🔒 ADMIN | Update order status                 |

**GET / query:** `?status=&customerId=&dateFrom=&dateTo=&page=1&limit=20`

**PUT /:id/status**

```json
{ "status": "pending|confirmed|processing|shipped|delivered|cancelled|refunded", "note?": "string" }
```

---

## 8. Customers (Admin)

Base: `/api/v1/customers` — 🔒 ALL ADMIN

| Method | Path   | Auth     | Description                              |
| ------ | ------ | -------- | ---------------------------------------- |
| GET    | `/`    | 🔒 ADMIN | List customers (`?search=&page=&limit=`) |
| GET    | `/:id` | 🔒 ADMIN | Get customer (with addresses + orders)   |
| POST   | `/`    | 🔒 ADMIN | Create customer                          |
| PUT    | `/:id` | 🔒 ADMIN | Update customer                          |

---

## 9. Storefront Customers

Base: `/api/v1/storefront/customers` — PUBLIC route, but uses customer JWT

| Method | Path                                | Auth            | Description           |
| ------ | ----------------------------------- | --------------- | --------------------- |
| GET    | `/:customerId/addresses`            | 🔑 Customer JWT | List addresses        |
| POST   | `/:customerId/addresses`            | 🔑 Customer JWT | Create address        |
| PUT    | `/:customerId/addresses/:addressId` | 🔑 Customer JWT | Update address        |
| DELETE | `/:customerId/addresses/:addressId` | 🔑 Customer JWT | Delete address        |
| GET    | `/:customerId/orders`               | 🔑 Customer JWT | Get customer's orders |

**POST /:customerId/addresses (AddressSchema)**

```json
{
  "firstName": "string",
  "lastName": "string",
  "addressLine1": "string",
  "addressLine2?": "string",
  "city": "string",
  "postalCode": "string",
  "country": "string",
  "phone?": "string",
  "isDefault?": false
}
```

---

## 10. Pages

Base: `/api/v1/pages`

| Method | Path                 | Auth                        | Description                                              |
| ------ | -------------------- | --------------------------- | -------------------------------------------------------- |
| GET    | `/`                  | PUBLIC                      | List pages (filterable, paginated)                       |
| GET    | `/homepage`          | PUBLIC                      | Get homepage                                             |
| GET    | `/by-type/:pageType` | PUBLIC                      | Get by type (cart, checkout, product, account, error404) |
| GET    | `/:idOrSlug`         | PUBLIC                      | Get by ID or slug                                        |
| POST   | `/`                  | 🔒 ADMIN (admin/superadmin) | Create page                                              |
| PUT    | `/:id`               | 🔒 ADMIN (admin/superadmin) | Update page                                              |
| PUT    | `/:id/publish`       | 🔒 ADMIN (admin/superadmin) | Publish page                                             |
| PUT    | `/:id/unpublish`     | 🔒 ADMIN (admin/superadmin) | Unpublish page                                           |
| DELETE | `/:id`               | 🔒 ADMIN (admin/superadmin) | Delete page                                              |

---

## 11. Media

Base: `/api/v1/media` — 🔒 ALL ADMIN

| Method | Path       | Auth     | Description                       |
| ------ | ---------- | -------- | --------------------------------- |
| POST   | `/upload`  | 🔒 ADMIN | Upload file (multipart, 10MB max) |
| GET    | `/`        | 🔒 ADMIN | List media (paginated)            |
| GET    | `/:id`     | 🔒 ADMIN | Get media by ID                   |
| DELETE | `/:id`     | 🔒 ADMIN | Delete media                      |
| PUT    | `/reorder` | 🔒 ADMIN | Reorder media items               |

**POST /upload** — multipart form: `file`, `alt?`, `entityType?`, `entityId?`, `sortOrder?`

---

## 12. Shipping

Base: `/api/v1/shipping`

| Method | Path                 | Auth                        | Description                                                |
| ------ | -------------------- | --------------------------- | ---------------------------------------------------------- |
| GET    | `/methods`           | PUBLIC                      | List active shipping methods                               |
| GET    | `/methods/available` | PUBLIC                      | Get methods for country + total (`?country=DE&total=5000`) |
| GET    | `/methods/all`       | 🔒 ADMIN                    | All methods (including inactive)                           |
| POST   | `/methods`           | 🔒 ADMIN (admin/superadmin) | Create method                                              |
| PUT    | `/methods/:id`       | 🔒 ADMIN (admin/superadmin) | Update method                                              |
| DELETE | `/methods/:id`       | 🔒 ADMIN (admin/superadmin) | Delete method                                              |

**POST /methods**

```json
{
  "name": "string",
  "description?": "string",
  "price": 499,
  "estimatedDays?": "2-3",
  "isActive?": true,
  "countries?": ["DE", "AT"],
  "minOrderValue?": 0,
  "freeAbove?": 5000
}
```

---

## 13. Coupons

### Admin: `/api/v1/coupons` — 🔒 ADMIN (admin/superadmin)

| Method | Path   | Auth     | Description      |
| ------ | ------ | -------- | ---------------- |
| GET    | `/`    | 🔒 ADMIN | List all coupons |
| POST   | `/`    | 🔒 ADMIN | Create coupon    |
| PUT    | `/:id` | 🔒 ADMIN | Update coupon    |
| DELETE | `/:id` | 🔒 ADMIN | Delete coupon    |

### Public: `/api/v1/public/coupons`

| Method | Path        | Auth   | Description                     |
| ------ | ----------- | ------ | ------------------------------- |
| POST   | `/validate` | PUBLIC | Validate coupon code            |
| POST   | `/apply`    | PUBLIC | Apply coupon (increments usage) |

**POST /public/coupons/validate**

```json
{ "code": "SAVE10", "cartTotal": 5000 }
```

**Create coupon:**

```json
{
  "code": "SAVE10",
  "type": "percentage|fixed_amount|free_shipping",
  "value": 1000,
  "minOrderAmount?": 2000,
  "maxUses?": 100,
  "maxUsesPerCustomer?": 1,
  "startsAt?": "ISO8601",
  "expiresAt?": "ISO8601",
  "enabled?": true
}
```

---

## 14. Search

### Public: `/api/v1/search` — PUBLIC

| Method | Path           | Auth   | Description              |
| ------ | -------------- | ------ | ------------------------ |
| GET    | `/`            | PUBLIC | Full-text product search |
| GET    | `/suggestions` | PUBLIC | Autocomplete suggestions |
| GET    | `/popular`     | PUBLIC | Popular search terms     |

**GET /search?q=shoes&category=uuid&priceMin=1000&priceMax=5000&sort=relevance&limit=20&offset=0**

### Public Search Overlay: `/api/v1/public/search`

| Method | Path        | Auth   | Description                  |
| ------ | ----------- | ------ | ---------------------------- |
| GET    | `/instant`  | PUBLIC | Instant search (lightweight) |
| GET    | `/popular`  | PUBLIC | Popular terms                |
| GET    | `/trending` | PUBLIC | Trending products            |
| POST   | `/track`    | PUBLIC | Track product events         |

**POST /public/search/track**

```json
{
  "productId": "uuid",
  "eventType": "view|click|cart_add|purchase",
  "sessionId?": "string",
  "query?": "string"
}
```

### Admin Analytics: `/api/v1/search` — 🔒 ADMIN

| Method | Path                        | Auth     | Description               |
| ------ | --------------------------- | -------- | ------------------------- |
| GET    | `/analytics`                | 🔒 ADMIN | Search analytics overview |
| GET    | `/zero-results`             | 🔒 ADMIN | Zero-result searches      |
| GET    | `/analytics/ctr`            | 🔒 ADMIN | Click-through rates       |
| GET    | `/analytics/top-products`   | 🔒 ADMIN | Top clicked products      |
| GET    | `/analytics/query-products` | 🔒 ADMIN | Query→product mapping     |
| GET    | `/analytics/rankings`       | 🔒 ADMIN | Product ranking scores    |

---

## 15. Chat

### Public (Storefront): `/api/v1/chat` — PUBLIC

| Method | Path          | Auth   | Description                   |
| ------ | ------------- | ------ | ----------------------------- |
| GET    | `/status`     | PUBLIC | Check if chatbot is available |
| POST   | `/`           | PUBLIC | Send chat message             |
| GET    | `/:sessionId` | PUBLIC | Get chat history              |

**POST /chat**

```json
{ "sessionId?": "string|null", "message": "string (max 2000)" }
```

### Admin: `/api/v1/chat/admin` — 🔒 ADMIN

| Method | Path            | Auth     | Description          |
| ------ | --------------- | -------- | -------------------- |
| GET    | `/settings`     | 🔒 ADMIN | Get chatbot settings |
| PUT    | `/settings`     | 🔒 ADMIN | Update settings      |
| GET    | `/sessions`     | 🔒 ADMIN | List chat sessions   |
| GET    | `/sessions/:id` | 🔒 ADMIN | Session details      |

---

## 16. Reviews (Admin)

Base: `/api/v1/reviews` — 🔒 ADMIN (admin/superadmin)

| Method | Path           | Auth     | Description                          |
| ------ | -------------- | -------- | ------------------------------------ |
| GET    | `/`            | 🔒 ADMIN | List all reviews (`?status=pending`) |
| PUT    | `/:id/approve` | 🔒 ADMIN | Approve review                       |
| PUT    | `/:id/reject`  | 🔒 ADMIN | Reject review                        |
| DELETE | `/:id`         | 🔒 ADMIN | Delete review                        |

---

## 17. Wishlists

Base: `/api/v1/wishlists` — 🔑 Customer JWT required

| Method | Path          | Auth            | Description                       |
| ------ | ------------- | --------------- | --------------------------------- |
| GET    | `/`           | 🔑 Customer JWT | Get wishlist with product details |
| POST   | `/:productId` | 🔑 Customer JWT | Toggle product in wishlist        |
| DELETE | `/:productId` | 🔑 Customer JWT | Remove from wishlist              |

---

## 18. Theme Settings

Base: `/api/v1/theme-settings`

| Method | Path     | Auth                        | Description            |
| ------ | -------- | --------------------------- | ---------------------- |
| GET    | `/`      | PUBLIC                      | Get all theme settings |
| PUT    | `/`      | 🔒 ADMIN (admin/superadmin) | Bulk update settings   |
| POST   | `/reset` | 🔒 ADMIN (admin/superadmin) | Reset to defaults      |

**PUT /**

```json
[
  { "key": "primary", "value": "#1f2937" },
  { "key": "borderRadius", "value": "12" }
]
```

---

## 19. Translations

### Admin: `/api/v1/translations` — 🔒 ADMIN

| Method | Path                           | Auth     | Description                      |
| ------ | ------------------------------ | -------- | -------------------------------- |
| GET    | `/`                            | 🔒 ADMIN | List languages with completion % |
| GET    | `/:locale`                     | 🔒 ADMIN | Get all keys for locale          |
| PUT    | `/:locale`                     | 🔒 ADMIN | Full replace locale overrides    |
| PATCH  | `/:locale`                     | 🔒 ADMIN | Patch specific keys              |
| POST   | `/`                            | 🔒 ADMIN | Create new language              |
| POST   | `/:locale/set-default`         | 🔒 ADMIN | Set default language             |
| DELETE | `/:locale`                     | 🔒 ADMIN | Delete language                  |
| GET    | `/export/:locale`              | 🔒 ADMIN | Export as JSON                   |
| POST   | `/import/:locale`              | 🔒 ADMIN | Import JSON                      |
| POST   | `/:locale/auto-translate`      | 🔒 ADMIN | AI translate missing keys        |
| POST   | `/:locale/auto-translate-keys` | 🔒 ADMIN | AI translate specific keys       |

### Public: `/api/v1/public/translations`

| Method | Path       | Auth   | Description             |
| ------ | ---------- | ------ | ----------------------- |
| GET    | `/`        | PUBLIC | List enabled locales    |
| GET    | `/:locale` | PUBLIC | Get merged translations |

---

## 20. Currencies

### Admin: `/api/v1/currencies` — 🔒 ADMIN

| Method | Path                                       | Auth                        | Description               |
| ------ | ------------------------------------------ | --------------------------- | ------------------------- |
| GET    | `/all`                                     | 🔒 ADMIN                    | List all currencies       |
| GET    | `/:code`                                   | 🔒 ADMIN                    | Get currency              |
| POST   | `/`                                        | 🔒 ADMIN (admin/superadmin) | Create currency           |
| PUT    | `/:code`                                   | 🔒 ADMIN (admin/superadmin) | Update currency           |
| PUT    | `/:code/rate`                              | 🔒 ADMIN (admin/superadmin) | Update exchange rate      |
| POST   | `/refresh-rates`                           | 🔒 ADMIN (admin/superadmin) | Refresh auto-update rates |
| PUT    | `/:code/auto-update`                       | 🔒 ADMIN (admin/superadmin) | Toggle auto-update        |
| DELETE | `/:code`                                   | 🔒 ADMIN (admin/superadmin) | Delete currency           |
| GET    | `/product-prices/:productId`               | 🔒 ADMIN                    | Get product prices        |
| PUT    | `/product-prices/:productId/:currencyCode` | 🔒 ADMIN                    | Upsert product price      |
| DELETE | `/product-prices/:productId/:currencyCode` | 🔒 ADMIN                    | Delete price override     |

### Public: `/api/v1/public/currencies`

| Method | Path                | Auth   | Description                                     |
| ------ | ------------------- | ------ | ----------------------------------------------- |
| GET    | `/`                 | PUBLIC | List active currencies                          |
| GET    | `/price/:productId` | PUBLIC | Get product price in currency (`?currency=USD`) |

---

## 21. Tax

Base: `/api/v1/tax`

### Tax Classes

| Method | Path           | Auth                        | Description      |
| ------ | -------------- | --------------------------- | ---------------- |
| GET    | `/classes`     | 🔒 ADMIN                    | List tax classes |
| GET    | `/classes/:id` | 🔒 ADMIN                    | Get tax class    |
| POST   | `/classes`     | 🔒 ADMIN (admin/superadmin) | Create           |
| PUT    | `/classes/:id` | 🔒 ADMIN (admin/superadmin) | Update           |
| DELETE | `/classes/:id` | 🔒 ADMIN (admin/superadmin) | Delete           |

### Tax Zones

| Method | Path         | Auth                        | Description |
| ------ | ------------ | --------------------------- | ----------- |
| GET    | `/zones`     | 🔒 ADMIN                    | List zones  |
| GET    | `/zones/:id` | 🔒 ADMIN                    | Get zone    |
| POST   | `/zones`     | 🔒 ADMIN (admin/superadmin) | Create      |
| PUT    | `/zones/:id` | 🔒 ADMIN (admin/superadmin) | Update      |
| DELETE | `/zones/:id` | 🔒 ADMIN (admin/superadmin) | Delete      |

### Tax Rules

| Method | Path         | Auth                        | Description             |
| ------ | ------------ | --------------------------- | ----------------------- |
| GET    | `/rules`     | 🔒 ADMIN                    | List rules (filterable) |
| GET    | `/rules/:id` | 🔒 ADMIN                    | Get rule                |
| POST   | `/rules`     | 🔒 ADMIN (admin/superadmin) | Create                  |
| PUT    | `/rules/:id` | 🔒 ADMIN (admin/superadmin) | Update                  |
| DELETE | `/rules/:id` | 🔒 ADMIN (admin/superadmin) | Delete                  |

### Tax Settings & Public

| Method | Path            | Auth                        | Description      |
| ------ | --------------- | --------------------------- | ---------------- |
| GET    | `/settings`     | 🔒 ADMIN                    | Get tax settings |
| PUT    | `/settings`     | 🔒 ADMIN (admin/superadmin) | Update settings  |
| POST   | `/calculate`    | 🔒 ADMIN                    | Calculate tax    |
| POST   | `/validate-vat` | 🔒 ADMIN                    | Validate VAT ID  |

---

## 22. Attributes

Base: `/api/v1/attributes` — 🔒 ALL ADMIN

| Method | Path   | Auth     | Description         |
| ------ | ------ | -------- | ------------------- |
| GET    | `/`    | 🔒 ADMIN | List all attributes |
| GET    | `/:id` | 🔒 ADMIN | Get attribute       |
| POST   | `/`    | 🔒 ADMIN | Create attribute    |
| PUT    | `/:id` | 🔒 ADMIN | Update attribute    |
| DELETE | `/:id` | 🔒 ADMIN | Delete attribute    |

### Public Attributes: `/api/v1/public/products/attributes`

| Method | Path | Auth   | Description         |
| ------ | ---- | ------ | ------------------- |
| GET    | `/`  | PUBLIC | List all attributes |

### Public Variants: `/api/v1/public/products/:productId/variants`

| Method | Path | Auth   | Description              |
| ------ | ---- | ------ | ------------------------ |
| GET    | `/`  | PUBLIC | Get variants for product |

---

## 23. Users (Admin Management)

Base: `/api/v1/users` — 🔒 ADMIN

| Method | Path            | Auth                          | Description         |
| ------ | --------------- | ----------------------------- | ------------------- |
| GET    | `/me`           | 🔒 ADMIN                      | Own profile         |
| PUT    | `/me`           | 🔒 ADMIN                      | Update own profile  |
| PUT    | `/me/password`  | 🔒 ADMIN                      | Change own password |
| GET    | `/`             | 🔒 ADMIN (superadmin)         | List all users      |
| POST   | `/`             | 🔒 ADMIN (superadmin)         | Create user         |
| GET    | `/:id`          | 🔒 ADMIN (superadmin)         | Get user            |
| PUT    | `/:id`          | 🔒 ADMIN (superadmin)         | Update user         |
| DELETE | `/:id`          | 🔒 ADMIN (superadmin)         | Delete user         |
| PUT    | `/:id/password` | 🔒 ADMIN (superadmin or self) | Change password     |

**POST / (create user)**

```json
{
  "email": "string",
  "password": "string (min 8)",
  "firstName": "string",
  "lastName": "string",
  "role": "superadmin|admin|editor",
  "isActive?": true
}
```

---

## 24. Mobile App Builder

Base: `/api/v1/mobile-app` — 🔒 ALL ADMIN

| Method | Path                   | Auth     | Description               |
| ------ | ---------------------- | -------- | ------------------------- |
| GET    | `/config`              | 🔒 ADMIN | Get mobile app config     |
| PUT    | `/config`              | 🔒 ADMIN | Update config             |
| POST   | `/generate`            | 🔒 ADMIN | Generate Expo project ZIP |
| POST   | `/build-native`        | 🔒 ADMIN | Start native APK build    |
| GET    | `/build-native/status` | 🔒 ADMIN | Poll build progress       |
| POST   | `/build`               | 🔒 ADMIN | Trigger cloud build       |
| GET    | `/build/status`        | 🔒 ADMIN | Check build status        |
| GET    | `/download/:type`      | 🔒 ADMIN | Download APK/IPA          |

---

## 25. AI

Base: `/api/v1/ai` — 🔒 ALL ADMIN

| Method | Path                        | Auth     | Description                  |
| ------ | --------------------------- | -------- | ---------------------------- |
| GET    | `/status`                   | 🔒 ADMIN | Provider status              |
| POST   | `/settings`                 | 🔒 ADMIN | Save AI settings             |
| GET    | `/settings`                 | 🔒 ADMIN | Get settings (masked key)    |
| POST   | `/test`                     | 🔒 ADMIN | Test AI connection           |
| POST   | `/products/:id/description` | 🔒 ADMIN | Generate product description |
| POST   | `/products/:id/seo`         | 🔒 ADMIN | Generate SEO metadata        |
| POST   | `/products/:id/improve`     | 🔒 ADMIN | Improve description          |

---

## 26. SEO

### Admin: `/api/v1/seo` — 🔒 ADMIN

| Method | Path                      | Auth     | Description              |
| ------ | ------------------------- | -------- | ------------------------ |
| POST   | `/products/:id/generate`  | 🔒 ADMIN | Generate meta tags       |
| POST   | `/products/:id/alt-texts` | 🔒 ADMIN | Generate image alt texts |
| POST   | `/products/bulk-generate` | 🔒 ADMIN | Bulk generate meta       |
| GET    | `/products/:id/analysis`  | 🔒 ADMIN | SEO analysis             |
| GET    | `/products/:id/schema`    | 🔒 ADMIN | Schema.org JSON-LD       |
| GET    | `/products/:id/og`        | 🔒 ADMIN | Open Graph tags          |
| GET    | `/overview`               | 🔒 ADMIN | SEO dashboard            |
| GET    | `/settings`               | 🔒 ADMIN | Get SEO settings         |
| PUT    | `/settings`               | 🔒 ADMIN | Update SEO settings      |

### Public

| Method | Path           | Auth   | Description        |
| ------ | -------------- | ------ | ------------------ |
| GET    | `/sitemap.xml` | PUBLIC | Dynamic sitemap    |
| GET    | `/robots.txt`  | PUBLIC | Dynamic robots.txt |

---

## 27. Emails

Base: `/api/v1/emails` — 🔒 ALL ADMIN

| Method | Path    | Auth     | Description                 |
| ------ | ------- | -------- | --------------------------- |
| POST   | `/test` | 🔒 ADMIN | Send test email             |
| GET    | `/log`  | 🔒 ADMIN | Get email log (`?limit=50`) |

---

## 28. Plugins

Base: `/api/v1/plugins` — 🔒 ALL ADMIN

| Method | Path            | Auth     | Description                   |
| ------ | --------------- | -------- | ----------------------------- |
| GET    | `/`             | 🔒 ADMIN | List all plugins              |
| PUT    | `/:id/toggle`   | 🔒 ADMIN | Toggle plugin active/inactive |
| PUT    | `/:id/settings` | 🔒 ADMIN | Update plugin settings        |

---

## 29. Cache

Base: `/api/v1/cache` — 🔒 ADMIN

| Method | Path     | Auth     | Description                   |
| ------ | -------- | -------- | ----------------------------- |
| POST   | `/purge` | 🔒 ADMIN | Purge storefront cache + warm |

**POST /purge**

```json
{ "paths?": ["/products/shoe-1"], "warm?": true }
```

---

## Response Format

All endpoints return JSON. Success responses:

```json
{ "data": { ... } }
// or for lists:
{ "data": [...], "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }
```

Error responses:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

HTTP status codes: 200 (ok), 201 (created), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict).
