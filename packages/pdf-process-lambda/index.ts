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
import {
  APIGatewayProxyEventV2,
  S3Event,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

const S3 = new S3Client({});

const METRIC_NAMESPACE = "Stablio";
const BILLIO_SEARCH_METRIC = "BillioSearchSuccess";

export const handler = metricScope(
  (metrics) =>
    async (
      event: S3Event | APIGatewayProxyEventV2,
    ): Promise<APIGatewayProxyStructuredResultV2 | void> => {
      metrics.setNamespace(METRIC_NAMESPACE);

      if ("requestContext" in event) {
        if (event.requestContext.http.method !== "POST") {
          return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" }),
            headers: { "Content-Type": "application/json" },
          };
        }

        const body = JSON.parse(event.body || "{}");
        const { key, bucket } = body;

        if (!key || typeof key !== "string") {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Missing or invalid 'key' in request body",
            }),
            headers: { "Content-Type": "application/json" },
          };
        }

        if (!bucket || typeof bucket !== "string") {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Missing or invalid 'bucket' in request body",
            }),
            headers: { "Content-Type": "application/json" },
          };
        }

        try {
          await processPdf({ key, bucket }, metrics);
          return {
            statusCode: 200,
            body: JSON.stringify({ message: "Successfully processed PDF" }),
            headers: { "Content-Type": "application/json" },
          };
        } catch (error) {
          console.error("Error processing PDF:", error);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to process PDF" }),
            headers: { "Content-Type": "application/json" },
          };
        }
      }

      // Handle S3 event
      const record = event.Records[0];
      await processPdf(
        {
          bucket: record.s3.bucket.name,
          key: decodeURIComponent(record.s3.object.key),
        },
        metrics,
      );
    },
);

interface PdfLocation {
  bucket: string;
  key: string;
}

async function processPdf({ bucket, key }: PdfLocation, metrics: any) {
  const pdfBuffer = await fetchPdfFromS3({ bucket, key });
  const bookHighlights = await extractHighlightsFromPdf(pdfBuffer);
  const billioId = await findBillioId(bookHighlights.title);
  metrics.putMetric(BILLIO_SEARCH_METRIC, billioId ? 1 : 0, Unit.Count);
  console.log(
    `Records to write: ${JSON.stringify(
      { ...bookHighlights, billioId },
      null,
      2,
    )}`,
  );
  await insertIntoDb({
    ...bookHighlights,
    billioId,
  });
}

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

async function fetchPdfFromS3({ bucket, key }: PdfLocation): Promise<Buffer> {
  const data = await S3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!data.Body) {
    throw new Error("Missing data body");
  }

  return Buffer.from(await data.Body.transformToByteArray());
}

async function extractHighlightsFromPdf(
  pdfBuffer: Buffer,
): Promise<BookHighlights> {
  const pages = await pdfToPages(pdfBuffer, { nodeSep: " " });
  const rawHighlights = parseHighlightsFromPages(pages);
  return {
    ...rawHighlights,
    title: formatTitle(rawHighlights.title),
  };
}
