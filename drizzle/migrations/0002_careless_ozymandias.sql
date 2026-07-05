CREATE TYPE "public"."notification_type" AS ENUM('AGENT_LEFT_COMPANY', 'AGENT_JOINED_COMPANY', 'AGENT_INCIDENT_REPORTED', 'PARCEL_REASSIGNED', 'PARCEL_NEEDS_MANUAL_ASSIGNMENT');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"join_code" varchar(20) NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parcels" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" uuid;--> statement-breakpoint
DO $$
DECLARE
	default_company_id uuid;
	legacy_admin_id uuid;
BEGIN
	IF EXISTS (SELECT 1 FROM "users") OR EXISTS (SELECT 1 FROM "parcels") THEN
		INSERT INTO "companies" ("name", "join_code")
		VALUES ('Default Company', 'DEFAULT')
		RETURNING "id" INTO default_company_id;

		UPDATE "users" SET "company_id" = default_company_id WHERE "company_id" IS NULL;
		UPDATE "parcels" SET "company_id" = default_company_id WHERE "company_id" IS NULL;

		SELECT "id" INTO legacy_admin_id
		FROM "users"
		WHERE "role" = 'ADMIN' AND "company_id" = default_company_id
		ORDER BY "created_at"
		LIMIT 1;

		UPDATE "companies" SET "owner_id" = legacy_admin_id WHERE "id" = default_company_id;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "parcels" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
