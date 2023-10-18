import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import mailparser from "mailparser";
import { parse } from "csv-parse";
import { db, book, highlights } from "@mattb.tech/stablio-db";

const S3 = new S3Client({});

export async function handler(event: AWSLambda.S3Event) {
  const dbClient = await db;
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

  const parsedEmail = await mailparser.simpleParser(
    await data.Body.transformToString(),
  );
  const csvAttachment = parsedEmail.attachments
    .find(({ contentType }) => contentType === "text/csv")
    ?.content.toString("utf-8");
  if (!csvAttachment) {
    throw new Error("No CSV attachment");
  }

  const records = await parseCsv(csvAttachment);
  const { title, author, highlights: newHighlights } = reformatRecords(records);

  const [{ bookId }] = await dbClient
    .insert(book)
    .values({ title, author })
    .returning({ bookId: book.id });
  await dbClient
    .insert(highlights)
    .values(newHighlights.map((value) => ({ bookId, ...value })));
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

function reformatRecords(records: string[][]) {
  const [_, [title], [byLine], __, ___, ____, _____, ______, ...highlights] =
    records;

  const author = byLine.substring(3);

  return {
    title,
    author,
    highlights: highlights.map(([_, location, __, text]) => ({
      location: parseInt(location.substring(9)),
      text,
    })),
  };
}
