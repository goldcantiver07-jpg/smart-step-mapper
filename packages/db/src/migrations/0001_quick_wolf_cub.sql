ALTER TABLE "maps" ADD COLUMN "unit" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "final_answer" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "method" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "alternative_methods" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "formula_used" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "variables_used" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "substitution" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "calculation" text DEFAULT '' NOT NULL;