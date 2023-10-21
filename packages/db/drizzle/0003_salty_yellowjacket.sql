ALTER TABLE "book" ADD COLUMN "billioId" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "book_billioId_index" ON "book" ("billioId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "highlight_bookId_index" ON "highlight" ("bookId");