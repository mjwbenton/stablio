import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import mailparser from "mailparser";
import { parse } from "csv-parse";

const S3 = new S3Client({});

export async function handler(event: AWSLambda.S3Event) {
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
  console.log(csvAttachment);
  const parser = parse(csvAttachment, {
    trim: true,
    skip_empty_lines: true,
  });

  for await (const record of parser) {
    console.log(record);
  }
}
