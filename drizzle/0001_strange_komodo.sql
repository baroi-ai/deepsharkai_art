CREATE TABLE "global_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"type" text DEFAULT 'info',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
