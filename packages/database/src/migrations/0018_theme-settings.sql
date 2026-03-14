-- Theme settings for global design tokens (colors, typography, layout, buttons)
CREATE TABLE IF NOT EXISTS "theme_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(100) NOT NULL UNIQUE,
  "value" text NOT NULL,
  "type" varchar(20) NOT NULL DEFAULT 'string',
  "group" varchar(50) NOT NULL,
  "label" varchar(255),
  "description" text,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "theme_settings_group_idx" ON "theme_settings" ("group");
CREATE INDEX IF NOT EXISTS "theme_settings_key_idx" ON "theme_settings" ("key");

-- Seed default theme settings

-- Colors
INSERT INTO "theme_settings" ("key", "value", "type", "group", "label", "description", "sort_order")
VALUES
  ('primary', '#1f2937', 'color', 'colors', 'Primary Color', 'Main brand color used for buttons, links, and accents', 1),
  ('secondary', '#3b82f6', 'color', 'colors', 'Secondary Color', 'Secondary accent color', 2),
  ('accent', '#f59e0b', 'color', 'colors', 'Accent Color', 'Highlight color for badges, notifications, sale tags', 3),
  ('background', '#ffffff', 'color', 'colors', 'Background Color', 'Main page background', 4),
  ('text', '#111827', 'color', 'colors', 'Text Color', 'Primary text color', 5),
  ('muted', '#6b7280', 'color', 'colors', 'Muted Color', 'Secondary text, placeholders, subtle elements', 6)
ON CONFLICT ("key") DO NOTHING;

-- Typography
INSERT INTO "theme_settings" ("key", "value", "type", "group", "label", "description", "sort_order")
VALUES
  ('headingFont', 'Inter', 'font', 'typography', 'Heading Font', 'Font family for headings', 1),
  ('bodyFont', 'Inter', 'font', 'typography', 'Body Font', 'Font family for body text', 2),
  ('baseFontSize', '16', 'number', 'typography', 'Base Font Size', 'Base font size in pixels', 3),
  ('headingWeight', '700', 'number', 'typography', 'Heading Weight', 'Font weight for headings (400-900)', 4),
  ('bodyWeight', '400', 'number', 'typography', 'Body Weight', 'Font weight for body text (300-700)', 5)
ON CONFLICT ("key") DO NOTHING;

-- Layout
INSERT INTO "theme_settings" ("key", "value", "type", "group", "label", "description", "sort_order")
VALUES
  ('borderRadius', '8', 'number', 'layout', 'Border Radius', 'Default border radius in pixels', 1),
  ('containerMaxWidth', '1280', 'number', 'layout', 'Container Max Width', 'Maximum container width in pixels', 2),
  ('sectionSpacing', '64', 'number', 'layout', 'Section Spacing', 'Vertical spacing between sections in pixels', 3)
ON CONFLICT ("key") DO NOTHING;

-- Buttons
INSERT INTO "theme_settings" ("key", "value", "type", "group", "label", "description", "sort_order")
VALUES
  ('buttonRadius', '8', 'number', 'buttons', 'Button Radius', 'Button border radius in pixels', 1),
  ('buttonPaddingX', '24', 'number', 'buttons', 'Button Horizontal Padding', 'Horizontal padding in pixels', 2),
  ('buttonPaddingY', '12', 'number', 'buttons', 'Button Vertical Padding', 'Vertical padding in pixels', 3)
ON CONFLICT ("key") DO NOTHING;
