import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import mailparser from "mailparser";
import { parse } from "csv-parse";
import { db, book, highlight, sql } from "@mattb.tech/stablio-db";
import { findBillioId } from "./billioSearch.js";
import { Unit, metricScope } from "aws-embedded-metrics";

const S3 = new S3Client({});

const METRIC_NAMESPACE = "Stablio";
const BILLIO_SEARCH_METRIC = "BillioSearchSuccess";

export const handler = metricScope(
  (metrics) => async (event: AWSLambda.S3Event) => {
    metrics.setNamespace(METRIC_NAMESPACE);
    const emailString = await fetchEmailFromS3(event);
    const csvAttachment = await extractCsv(emailString);
    const records = await parseCsv(csvAttachment);
    const bookHighlights = formatBookHighlights(records);
    const billioId = await findBillioId(bookHighlights.title);
    metrics.putMetric(BILLIO_SEARCH_METRIC, billioId ? 1 : 0, Unit.Count);
    console.log(
      `Records to write: ${JSON.stringify(
        { ...bookHighlights, billioId },
        null,
        2,
      )}`,
    );
    await insertIntoDb({ ...bookHighlights, billioId });
  },
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

async function fetchEmailFromS3(event: AWSLambda.S3Event): Promise<string> {
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key);

  const data = await S3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!data.Body) {
    throw new Error("Missing data body");
  }

  return data.Body.transformToString();
}

async function extractCsv(emailString: string) {
  const parsedEmail = await mailparser.simpleParser(emailString);
  const csvAttachment = parsedEmail.attachments
    .find(({ contentType }) => contentType === "text/csv")
    ?.content.toString("utf-8");
  if (!csvAttachment) {
    throw new Error("No CSV attachment");
  }
  return csvAttachment;
}

async function parseCsv(csvAttachment: string): Promise<string[][]> {
  return await new Promise<string[][]>((res, rej) => {
    parse(
      csvAttachment,
      {
        trim: true,
        skip_empty_lines: true,
        relax_quotes: true,
      },
      (err, records) => {
        if (err) {
          rej(err);
        }
        res(records);
      },
    );
  });
}

function formatBookHighlights(records: string[][]): BookHighlights {
  const [_, [title], [byLine], __, ___, ____, _____, ______, ...highlights] =
    records;

  const author = byLine.substring(3);

  return {
    title,
    author,
    highlights: highlights.map(([_, location, __, text]) => ({
      location: parseInt(location.split(" ")[1]),
      text,
    })),
  };
}
