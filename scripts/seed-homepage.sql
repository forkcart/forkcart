-- Seed default homepage for page builder
-- Only inserts if no homepage exists yet
INSERT INTO pages (title, slug, status, is_homepage, content, seo_title, seo_description, published_at)
SELECT
  'Homepage',
  'home',
  'published',
  true,
  NULL,
  'ForkCart — Open Source E-Commerce',
  'The AI-native, plugin-first e-commerce platform. Build your store in minutes.',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM pages WHERE is_homepage = true
);
