CREATE TABLE IF NOT EXISTS "email_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(100) NOT NULL,
  "to" varchar(500) NOT NULL,
  "subject" varchar(500) NOT NULL,
  "template" varchar(100) NOT NULL,
  "message_id" varchar(500) NOT NULL,
  "status" varchar(50) DEFAULT 'sent' NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
