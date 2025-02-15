import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db, book, highlight } from "@mattb.tech/stablio-db";
import { sql } from "drizzle-orm";

const S3 = new S3Client({});

interface BackupData {
  books: Array<{
    id: number;
    title: string;
    author: string;
    billioId: string | null;
    highlights: Array<{
      id: number;
      location: number;
      text: string;
    }>;
  }>;
}

export const handler = async (event: { version?: string }) => {
  const dbClient = await db;

  // Get all books with their highlights
  const books = await dbClient
    .select({
      id: book.id,
      title: book.title,
      author: book.author,
      billioId: book.billioId,
      highlights: sql<Array<{ id: number; location: number; text: string }>>`
        json_agg(
          json_build_object(
            'id', ${highlight.id},
            'location', ${highlight.location},
            'text', ${highlight.text}
          )
        )`,
    })
    .from(book)
    .leftJoin(highlight, sql`${highlight.bookId} = ${book.id}`)
    .groupBy(book.id);

  const backupData: BackupData = {
    books: books.map((book) => ({
      ...book,
      highlights: book.highlights || [],
    })),
  };

  const timestamp = new Date().toISOString();
  const key = `backup-${timestamp}.json`;

  await S3.send(
    new PutObjectCommand({
      Bucket: process.env.BACKUP_BUCKET,
      Key: key,
      Body: JSON.stringify(backupData, null, 2),
      ContentType: "application/json",
    }),
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Backup completed: ${key}` }),
  };
};
