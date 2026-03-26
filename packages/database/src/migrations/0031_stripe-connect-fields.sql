ALTER TABLE "plugin_developers" ADD COLUMN "stripe_connect_id" varchar(255);
ALTER TABLE "plugin_developers" ADD COLUMN "stripe_onboarding_complete" boolean DEFAULT false NOT NULL;
