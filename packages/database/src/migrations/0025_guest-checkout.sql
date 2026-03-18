-- Guest checkout: make customerId nullable, add guest info fields
ALTER TABLE "orders" ALTER COLUMN "customer_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_email" varchar(255);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_first_name" varchar(100);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_last_name" varchar(100);
--> statement-breakpoint
CREATE INDEX "orders_guest_email_idx" ON "orders" ("guest_email");
