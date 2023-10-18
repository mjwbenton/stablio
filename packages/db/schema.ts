import { integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";

export const book = pgTable(
  "book",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author").notNull(),
  },
  (t) => ({
    unq: unique().on(t.title, t.author),
  }),
);

export const highlights = pgTable(
  "highlights",
  {
    id: serial("id").primaryKey(),
    book: integer("bookId")
      .references(() => book.id)
      .notNull(),
    location: integer("location").notNull(),
    text: text("text").notNull(),
  },
  (t) => ({
    unq: unique().on(t.book, t.location),
  }),
);
