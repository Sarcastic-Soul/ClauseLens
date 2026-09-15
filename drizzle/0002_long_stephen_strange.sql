ALTER TABLE "analyses" ADD COLUMN "content_hash" text;--> statement-breakpoint
CREATE INDEX "analyses_content_hash_idx" ON "analyses" USING btree ("content_hash");