-- Cookie Consent System (GDPR-compliant)

CREATE TABLE IF NOT EXISTS "cookie_consent_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(50) NOT NULL UNIQUE,
  "label" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "required" boolean NOT NULL DEFAULT false,
  "enabled" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cookie_consent_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(100) NOT NULL UNIQUE,
  "value" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cookie_consent_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" varchar(255),
  "customer_id" uuid,
  "consent" jsonb NOT NULL,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Default categories
INSERT INTO "cookie_consent_categories" ("key", "label", "description", "required", "sort_order") VALUES
  ('necessary', 'Notwendig', 'Diese Cookies sind für die Grundfunktionen des Shops erforderlich (Warenkorb, Anmeldung, Sicherheit). Sie können nicht deaktiviert werden.', true, 0),
  ('functional', 'Funktional', 'Ermöglicht erweiterte Funktionen wie Spracheinstellungen, Theme-Anpassungen und personalisierte Inhalte.', false, 1),
  ('analytics', 'Statistik & Analytics', 'Hilft uns zu verstehen, wie Besucher den Shop nutzen. Daten werden anonymisiert erhoben (z.B. Google Analytics, Seitenaufrufe).', false, 2),
  ('marketing', 'Marketing', 'Wird verwendet für personalisierte Werbung, Retargeting und Social-Media-Einbindungen.', false, 3);

-- Default settings
INSERT INTO "cookie_consent_settings" ("key", "value") VALUES
  ('banner_title', 'Wir respektieren Ihre Privatsphäre'),
  ('banner_text', 'Wir verwenden Cookies, um Ihnen das beste Einkaufserlebnis zu bieten. Einige sind notwendig, andere helfen uns, den Shop zu verbessern.'),
  ('banner_accept_all', 'Alle akzeptieren'),
  ('banner_reject_all', 'Nur notwendige'),
  ('banner_settings', 'Einstellungen'),
  ('modal_title', 'Cookie-Einstellungen'),
  ('modal_save', 'Auswahl speichern');
