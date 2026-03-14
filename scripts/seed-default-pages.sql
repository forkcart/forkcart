-- ForkCart Default Pages Seed
-- Run on fresh installation to create starter pages.
-- Idempotent: skips pages whose slug already exists.
-- Requires migration 0018_page-types.sql to have been applied first.

-- Homepage
INSERT INTO pages (title, slug, status, is_homepage, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Homepage', 'home', 'published', true, 'homepage', 0,
       'Welcome to Our Store',
       'Discover amazing products curated just for you. Free shipping, secure payments, and 24/7 support.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["hero1","iconGrid1","catGrid1","prodGrid1","testimonials1","newsletter1"],"displayName":"Container"},"hero1":{"type":{"resolvedName":"Hero"},"props":{"title":"Welcome to Our Store","subtitle":"Discover amazing products curated just for you","ctaText":"Shop Now","ctaLink":"/products","backgroundColor":"#1f2937","overlayOpacity":40,"height":"lg","alignment":"center","textColor":"#ffffff"},"nodes":[],"parent":"ROOT","displayName":"Hero Banner"},"iconGrid1":{"type":{"resolvedName":"IconGrid"},"props":{"items":[{"icon":"🚚","title":"Free Shipping","description":"On orders over $50"},{"icon":"🔒","title":"Secure Payment","description":"100% secure checkout"},{"icon":"↩️","title":"Easy Returns","description":"30-day return policy"},{"icon":"💬","title":"24/7 Support","description":"We are here to help"}],"columns":4,"iconSize":"md","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Icon Grid"},"catGrid1":{"type":{"resolvedName":"CategoryGrid"},"props":{"columns":3},"nodes":[],"parent":"ROOT","displayName":"Category Grid"},"prodGrid1":{"type":{"resolvedName":"ProductGrid"},"props":{"limit":8,"sortBy":"createdAt","columns":4},"nodes":[],"parent":"ROOT","displayName":"Product Grid"},"testimonials1":{"type":{"resolvedName":"Testimonials"},"props":{"items":[{"name":"Sarah Johnson","role":"Verified Buyer","content":"Amazing quality! The product exceeded my expectations.","rating":5},{"name":"Mike Chen","role":"Repeat Customer","content":"Fast shipping and great customer service. Highly recommended!","rating":5},{"name":"Emma Davis","role":"Verified Buyer","content":"Love the attention to detail. Beautiful packaging and top-notch quality.","rating":4}],"columns":3,"showRating":true,"backgroundColor":"#f9fafb"},"nodes":[],"parent":"ROOT","displayName":"Testimonials"},"newsletter1":{"type":{"resolvedName":"Newsletter"},"props":{},"nodes":[],"parent":"ROOT","displayName":"Newsletter"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'home');

-- About Us
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'About Us', 'about-us', 'published', 'custom', 10,
       'About Us — Our Story',
       'Learn about our mission, values, and the team behind the brand.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["hero1","text1","divider1","text2","button1"],"displayName":"Container"},"hero1":{"type":{"resolvedName":"Hero"},"props":{"title":"About Us","subtitle":"Our story, our mission, our values","ctaText":"","backgroundColor":"#374151","height":"md","alignment":"center","textColor":"#ffffff"},"nodes":[],"parent":"ROOT","displayName":"Hero Banner"},"text1":{"type":{"resolvedName":"TextBlock"},"props":{"content":"We started with a simple idea: bring high-quality products directly to you. Since our founding, we have been committed to excellence in everything we do — from sourcing the finest materials to providing outstanding customer service.\n\nOur team is passionate about creating products that make a difference in your daily life. Every item in our store has been carefully selected to meet our high standards of quality and value.","fontSize":"base","alignment":"center","maxWidth":"md"},"nodes":[],"parent":"ROOT","displayName":"Text"},"divider1":{"type":{"resolvedName":"Divider"},"props":{"style":"solid","color":"#e5e7eb","thickness":1,"width":"1/4","marginY":32},"nodes":[],"parent":"ROOT","displayName":"Divider"},"text2":{"type":{"resolvedName":"TextBlock"},"props":{"content":"**Our Mission**\n\nTo provide our customers with the best products at fair prices, delivered with exceptional service. We believe that everyone deserves access to quality goods without compromise.","fontSize":"base","alignment":"center","maxWidth":"md"},"nodes":[],"parent":"ROOT","displayName":"Text"},"button1":{"type":{"resolvedName":"ButtonBlock"},"props":{"text":"Browse Our Products","link":"/products","variant":"primary","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Button"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'about-us');

-- Contact
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Contact', 'contact', 'published', 'custom', 20,
       'Contact Us',
       'Have a question? Get in touch with our team.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["heading1","text1","form1","map1"],"displayName":"Container"},"heading1":{"type":{"resolvedName":"Heading"},"props":{"text":"Contact Us","level":"h1","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Heading"},"text1":{"type":{"resolvedName":"TextBlock"},"props":{"content":"Have a question or feedback? We would love to hear from you. Fill out the form below and we will get back to you as soon as possible.","fontSize":"base","alignment":"center","maxWidth":"md"},"nodes":[],"parent":"ROOT","displayName":"Text"},"form1":{"type":{"resolvedName":"ContactForm"},"props":{"title":"","subtitle":"","buttonText":"Send Message","showPhone":true,"showSubject":true},"nodes":[],"parent":"ROOT","displayName":"Contact Form"},"map1":{"type":{"resolvedName":"MapEmbed"},"props":{"query":"New York, NY","height":350,"borderRadius":12},"nodes":[],"parent":"ROOT","displayName":"Map"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'contact');

-- Privacy Policy
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Privacy Policy', 'privacy', 'draft', 'custom', 30,
       'Privacy Policy',
       'Read our privacy policy to understand how we collect, use, and protect your personal data.',
       NULL
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'privacy');

-- Terms & Conditions
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Terms & Conditions', 'terms', 'draft', 'custom', 40,
       'Terms & Conditions',
       'Read our terms and conditions governing use of our online store.',
       NULL
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'terms');

-- Product Detail (system page)
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Product Detail', 'product', 'published', 'product', 50,
       'Product Detail',
       'View product details, pricing, and reviews.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["hero1","text1","divider1","prodGrid1","divider2","text2"],"displayName":"Container"},"hero1":{"type":{"resolvedName":"Hero"},"props":{"title":"Product Name","subtitle":"Product tagline or short description","ctaText":"Add to Cart","ctaLink":"#","backgroundColor":"#111827","height":"lg","alignment":"center","textColor":"#ffffff"},"nodes":[],"parent":"ROOT","displayName":"Product Hero"},"text1":{"type":{"resolvedName":"TextBlock"},"props":{"content":"**Product Details**\n\nThis section is dynamically replaced with the actual product information (price, description, variants, and add-to-cart button) when viewing a real product. Customize the surrounding layout here in the Page Builder.","fontSize":"base","alignment":"center","maxWidth":"md"},"nodes":[],"parent":"ROOT","displayName":"Product Info"},"divider1":{"type":{"resolvedName":"Divider"},"props":{"style":"solid","color":"#e5e7eb","thickness":1,"width":"1/2","marginY":24},"nodes":[],"parent":"ROOT","displayName":"Divider"},"prodGrid1":{"type":{"resolvedName":"ProductGrid"},"props":{"limit":4,"columns":4},"nodes":[],"parent":"ROOT","displayName":"Related Products"},"divider2":{"type":{"resolvedName":"Divider"},"props":{"style":"solid","color":"#e5e7eb","thickness":1,"width":"1/2","marginY":24},"nodes":[],"parent":"ROOT","displayName":"Divider"},"text2":{"type":{"resolvedName":"TextBlock"},"props":{"content":"**Customer Reviews**\n\nReviews are loaded dynamically from the product review system. This placeholder shows where they will appear on the page.","fontSize":"base","alignment":"center","maxWidth":"md"},"nodes":[],"parent":"ROOT","displayName":"Reviews Section"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'product');

-- Shopping Cart (system page)
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Shopping Cart', 'cart', 'published', 'cart', 60,
       'Shopping Cart',
       'Review your cart and proceed to checkout.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["heading1","text1","divider1","heading2","prodGrid1"],"displayName":"Container"},"heading1":{"type":{"resolvedName":"Heading"},"props":{"text":"Shopping Cart","level":"h1","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Heading"},"text1":{"type":{"resolvedName":"TextBlock"},"props":{"content":"Your cart items are displayed dynamically below. This area is automatically replaced with your current cart contents, quantities, and totals when the page is rendered.","fontSize":"base","alignment":"center","maxWidth":"md"},"nodes":[],"parent":"ROOT","displayName":"Cart Items Area"},"divider1":{"type":{"resolvedName":"Divider"},"props":{"style":"solid","color":"#e5e7eb","thickness":1,"width":"1/2","marginY":32},"nodes":[],"parent":"ROOT","displayName":"Divider"},"heading2":{"type":{"resolvedName":"Heading"},"props":{"text":"You Might Also Like","level":"h2","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Cross-sell Heading"},"prodGrid1":{"type":{"resolvedName":"ProductGrid"},"props":{"limit":4,"columns":4},"nodes":[],"parent":"ROOT","displayName":"Cross-sell Products"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'cart');

-- Checkout (system page)
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Checkout', 'checkout', 'published', 'checkout', 70,
       'Checkout',
       'Complete your purchase securely.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["heading1","text1","iconGrid1"],"displayName":"Container"},"heading1":{"type":{"resolvedName":"Heading"},"props":{"text":"Checkout","level":"h1","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Heading"},"text1":{"type":{"resolvedName":"TextBlock"},"props":{"content":"The checkout steps (shipping address, payment method, order review) are rendered dynamically here. Customize the surrounding page elements using the Page Builder.","fontSize":"base","alignment":"center","maxWidth":"md"},"nodes":[],"parent":"ROOT","displayName":"Checkout Steps"},"iconGrid1":{"type":{"resolvedName":"IconGrid"},"props":{"items":[{"icon":"🔒","title":"Secure Checkout","description":"SSL encrypted payment"},{"icon":"🚚","title":"Fast Shipping","description":"Quick and reliable delivery"},{"icon":"↩️","title":"Easy Returns","description":"Hassle-free return policy"}],"columns":3,"iconSize":"md","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Trust Badges"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'checkout');

-- My Account (system page)
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'My Account', 'account', 'published', 'account', 80,
       'My Account',
       'Manage your orders, addresses, and account settings.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["heading1","text1","iconGrid1"],"displayName":"Container"},"heading1":{"type":{"resolvedName":"Heading"},"props":{"text":"My Account","level":"h1","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Heading"},"text1":{"type":{"resolvedName":"TextBlock"},"props":{"content":"Welcome to your account dashboard. Manage your orders, addresses, and account settings below. The account functionality is loaded dynamically.","fontSize":"base","alignment":"center","maxWidth":"md"},"nodes":[],"parent":"ROOT","displayName":"Dashboard Text"},"iconGrid1":{"type":{"resolvedName":"IconGrid"},"props":{"items":[{"icon":"📦","title":"Orders","description":"View your order history"},{"icon":"📍","title":"Addresses","description":"Manage shipping addresses"},{"icon":"⚙️","title":"Settings","description":"Account preferences"}],"columns":3,"iconSize":"lg","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Account Sections"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'account');

-- Page Not Found (system page)
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Page Not Found', '404', 'published', 'error404', 90,
       'Page Not Found',
       'The page you are looking for does not exist.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["hero1","button1"],"displayName":"Container"},"hero1":{"type":{"resolvedName":"Hero"},"props":{"title":"Page Not Found","subtitle":"Sorry, the page you are looking for does not exist or has been moved.","ctaText":"","backgroundColor":"#1f2937","height":"md","alignment":"center","textColor":"#ffffff"},"nodes":[],"parent":"ROOT","displayName":"Hero Banner"},"button1":{"type":{"resolvedName":"ButtonBlock"},"props":{"text":"Back to Homepage","link":"/","variant":"primary","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Button"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = '404');

-- Search Results (system page)
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Search Results', 'search', 'published', 'search', 100,
       'Search Results',
       'Search our products and find what you need.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["heading1","prodGrid1"],"displayName":"Container"},"heading1":{"type":{"resolvedName":"Heading"},"props":{"text":"Search Results","level":"h1","alignment":"center"},"nodes":[],"parent":"ROOT","displayName":"Heading"},"prodGrid1":{"type":{"resolvedName":"ProductGrid"},"props":{"limit":12,"columns":4},"nodes":[],"parent":"ROOT","displayName":"Search Results Grid"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'search');

-- Category (system page)
INSERT INTO pages (title, slug, status, page_type, sort_order, seo_title, seo_description, content)
SELECT 'Category', 'category', 'published', 'category', 110,
       'Category',
       'Browse products by category.',
       '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"paddingX":0,"paddingY":0,"maxWidth":"full","backgroundColor":"transparent"},"nodes":["hero1","prodGrid1","newsletter1"],"displayName":"Container"},"hero1":{"type":{"resolvedName":"Hero"},"props":{"title":"Category Name","subtitle":"Browse our collection","ctaText":"","backgroundColor":"#374151","height":"md","alignment":"center","textColor":"#ffffff"},"nodes":[],"parent":"ROOT","displayName":"Category Hero"},"prodGrid1":{"type":{"resolvedName":"ProductGrid"},"props":{"limit":12,"columns":4},"nodes":[],"parent":"ROOT","displayName":"Product Grid"},"newsletter1":{"type":{"resolvedName":"Newsletter"},"props":{},"nodes":[],"parent":"ROOT","displayName":"Newsletter"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'category');
