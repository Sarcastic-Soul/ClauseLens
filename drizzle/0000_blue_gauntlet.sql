CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" text NOT NULL,
	"file_name" text NOT NULL,
	"doc_type" text NOT NULL,
	"summary" text NOT NULL,
	"key_points" jsonb NOT NULL,
	"clause_context" text NOT NULL,
	"model_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analyses_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
CREATE TABLE "clauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"heading" text NOT NULL,
	"source_quote" text NOT NULL,
	"plain_language" text NOT NULL,
	"risk" text NOT NULL,
	"risk_reason" text NOT NULL,
	"obligation_on" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"answerable" boolean NOT NULL,
	"cited_clause_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;