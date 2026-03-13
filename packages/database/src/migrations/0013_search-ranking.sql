-- 0013: Product impressions for smart ranking & trending
CREATE TABLE IF NOT EXISTS product_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('view', 'click', 'cart_add', 'purchase')),
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_impressions_product_event_created_idx
  ON product_impressions (product_id, event_type, created_at);

CREATE INDEX IF NOT EXISTS product_impressions_created_at_idx
  ON product_impressions (created_at);

CREATE INDEX IF NOT EXISTS product_impressions_event_type_idx
  ON product_impressions (event_type);
