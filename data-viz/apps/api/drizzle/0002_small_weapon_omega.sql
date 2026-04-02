ALTER TABLE "benchmark_config" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "benchmark_config" ALTER COLUMN "updated_at" SET DEFAULT now();