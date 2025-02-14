import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { db, book, highlight, sql } from "@mattb.tech/stablio-db";
import { findBillioId } from "./billioSearch.js";
import { Unit, metricScope } from "aws-embedded-metrics";
import { pdfToText } from "pdf-ts";

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
    await insertIntoDb({ ...bookHighlights, billioId });
  }
);

interface BookHighlights {
  title: string;
  author: string;
  highlights: {
    location: number;
    text: string;
  }[];
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
  const [{ bookId }] = await dbClient
    .insert(book)
    .values({ title, author, billioId })
    .onConflictDoUpdate({
      target: [book.title, book.author],
      set: { author, title, billioId },
    })
    .returning({ bookId: book.id });
  await dbClient
    .insert(highlight)
    .values(highlights.map((value) => ({ bookId, ...value })))
    .onConflictDoUpdate({
      target: [highlight.bookId, highlight.location, highlight.text],
      set: { text: sql`excluded.text` },
    });
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
  const text = await pdfToText(pdfBuffer);

  console.log("=== START PDF CONTENT ===");
  console.log({ text });
  console.log("=== END PDF CONTENT ===");

  throw new Error("PDF processing not yet implemented");
}
