-- Search analytics table
CREATE TABLE IF NOT EXISTS search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  clicked_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  session_id text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  search_mode varchar(20) NOT NULL DEFAULT 'basic',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS search_queries_query_idx ON search_queries(query);
CREATE INDEX IF NOT EXISTS search_queries_created_at_idx ON search_queries(created_at);
CREATE INDEX IF NOT EXISTS search_queries_results_count_idx ON search_queries(results_count);

-- Full-text search index on products (German config)
CREATE INDEX IF NOT EXISTS idx_products_search ON products
  USING gin(to_tsvector('german', name || ' ' || coalesce(description, '')));
