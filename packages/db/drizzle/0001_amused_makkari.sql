ALTER TABLE "book" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "book" ALTER COLUMN "author" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "highlights" ALTER COLUMN "bookId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "highlights" ALTER COLUMN "location" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "highlights" ALTER COLUMN "text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "book" ADD CONSTRAINT "book_title_author_unique" UNIQUE("title","author");--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_bookId_location_unique" UNIQUE("bookId","location");