import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { db, book, highlight, sql } from "@mattb.tech/stablio-db";
import { findBillioId } from "./billioSearch.js";
import { formatTitle } from "./formatTitle.js";
import { Unit, metricScope } from "aws-embedded-metrics";
import { pdfToPages } from "pdf-ts";
import {
  parseHighlightsFromPages,
  BookHighlights,
} from "./parseHighlightsFromPages.js";

const S3 = new S3Client({});

const METRIC_NAMESPACE = "Stablio";
const BILLIO_SEARCH_METRIC = "BillioSearchSuccess";

export const handler = metricScope(
  (metrics) => async (event: AWSLambda.S3Event) => {
    metrics.setNamespace(METRIC_NAMESPACE);
    const pdfBuffer = await fetchPdfFromS3(event);
    const bookHighlights = await extractHighlightsFromPdf(pdfBuffer);
    const billioId = await findBillioId(bookHighlights.title);
    metrics.putMetric(BILLIO_SEARCH_METRIC, billioId ? 1 : 0, Unit.Count);
    console.log(
      `Records to write: ${JSON.stringify(
        { ...bookHighlights, billioId },
        null,
        2
      )}`
    );
    await insertIntoDb({
      ...bookHighlights,
      billioId,
    });
  }
);

interface BookHighlightsWithBillio extends BookHighlights {
  billioId: string | undefined;
}

async function insertIntoDb({
  title,
  author,
  billioId,
  highlights,
}: BookHighlightsWithBillio): Promise<void> {
  const dbClient = await db;

  // First try to find an existing book by billioId if we have one
  let bookId: number | undefined;
  if (billioId) {
    const existingBook = await dbClient
      .select({ id: book.id })
      .from(book)
      .where(sql`${book.billioId} = ${billioId}`)
      .limit(1);

    if (existingBook.length > 0) {
      bookId = existingBook[0].id;
      // Update the title and author
      await dbClient
        .update(book)
        .set({ title, author })
        .where(sql`${book.id} = ${bookId}`);
    }
  }

  // If we didn't find a book by billioId, try insert/update by title and author
  if (!bookId) {
    const [{ bookId: newBookId }] = await dbClient
      .insert(book)
      .values({ title, author, billioId })
      .onConflictDoUpdate({
        target: [book.title, book.author],
        set: { billioId },
      })
      .returning({ bookId: book.id });
    bookId = newBookId;
  }

  // Delete all existing highlights for this book
  await dbClient.delete(highlight).where(sql`${highlight.bookId} = ${bookId}`);

  // Insert new highlights
  await dbClient
    .insert(highlight)
    .values(highlights.map((value) => ({ bookId, ...value })));
}

async function fetchPdfFromS3(event: AWSLambda.S3Event): Promise<Buffer> {
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key);

  const data = await S3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  if (!data.Body) {
    throw new Error("Missing data body");
  }

  return Buffer.from(await data.Body.transformToByteArray());
}

async function extractHighlightsFromPdf(
  pdfBuffer: Buffer
): Promise<BookHighlights> {
  const pages = await pdfToPages(pdfBuffer, { nodeSep: " " });
  const rawHighlights = parseHighlightsFromPages(pages);
  return {
    ...rawHighlights,
    title: formatTitle(rawHighlights.title),
  };
}
