ALTER TABLE "highlights" RENAME TO "highlight";--> statement-breakpoint
ALTER TABLE "highlight" DROP CONSTRAINT "highlights_bookId_location_unique";--> statement-breakpoint
ALTER TABLE "highlight" DROP CONSTRAINT "highlights_bookId_book_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "highlight" ADD CONSTRAINT "highlight_bookId_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "highlight" ADD CONSTRAINT "highlight_bookId_location_unique" UNIQUE("bookId","location");