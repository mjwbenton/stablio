import {
  index,
  integer,
  pgTable,
  serial,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const book = pgTable(
  "book",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    billioId: text("billioId"),
  },
  (t) => ({
    unq: unique().on(t.title, t.author),
    billioIdIdx: uniqueIndex().on(t.billioId),
  }),
);

export const highlight = pgTable(
  "highlight",
  {
    id: serial("id").primaryKey(),
    bookId: integer("bookId")
      .references(() => book.id)
      .notNull(),
    location: integer("location").notNull(),
    text: text("text").notNull(),
  },
  (t) => ({
    unq: unique().on(t.bookId, t.location, t.text),
    bookIdIdx: index().on(t.bookId),
  }),
);
