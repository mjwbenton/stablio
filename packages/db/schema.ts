import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const book = pgTable("book", {
  id: serial("id").primaryKey(),
  title: text("title"),
  author: text("author"),
});

export const highlights = pgTable("highlights", {
  id: serial("id").primaryKey(),
  book: integer("bookId").references(() => book.id),
  location: integer("location"),
  text: text("text"),
});
