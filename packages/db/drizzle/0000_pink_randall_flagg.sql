CREATE TABLE IF NOT EXISTS "book" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"author" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "highlights" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookId" integer,
	"location" integer,
	"text" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "highlights" ADD CONSTRAINT "highlights_bookId_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
