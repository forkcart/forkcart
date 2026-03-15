CREATE TABLE IF NOT EXISTS "mobile_app_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_name" varchar(100) NOT NULL DEFAULT 'My Store',
  "app_slug" varchar(100) NOT NULL DEFAULT 'my-store',
  "primary_color" varchar(7) NOT NULL DEFAULT '#000000',
  "accent_color" varchar(7) NOT NULL DEFAULT '#FF6B00',
  "background_color" varchar(7) NOT NULL DEFAULT '#FFFFFF',
  "icon_media_id" uuid,
  "splash_media_id" uuid,
  "api_url" varchar(500) NOT NULL DEFAULT '',
  "bundle_id" varchar(200) DEFAULT '',
  "android_package" varchar(200) DEFAULT '',
  "build_mode" varchar(20) NOT NULL DEFAULT 'casual',
  "last_build_at" timestamp with time zone,
  "last_build_status" varchar(20),
  "last_build_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "mobile_app_config" ADD CONSTRAINT "mobile_app_config_icon_media_id_media_id_fk" FOREIGN KEY ("icon_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "mobile_app_config" ADD CONSTRAINT "mobile_app_config_splash_media_id_media_id_fk" FOREIGN KEY ("splash_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
