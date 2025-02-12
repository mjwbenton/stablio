import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { simpleParser } from "mailparser";
import { Unit, metricScope } from "aws-embedded-metrics";

const S3 = new S3Client({});

const METRIC_NAMESPACE = "Stablio";
const PDF_EXTRACT_SUCCESS_METRIC = "PdfExtractSuccess";

export const handler = metricScope(
  (metrics) => async (event: AWSLambda.S3Event) => {
    metrics.setNamespace(METRIC_NAMESPACE);
    const emailString = await fetchEmailFromS3(event);
    const email = await simpleParser(emailString);

    // Find PDF link in email body
    const pdfUrl = extractPdfUrl(email.text || "");
    if (!pdfUrl) {
      console.error("No PDF URL found in email");
      metrics.putMetric(PDF_EXTRACT_SUCCESS_METRIC, 0, Unit.Count);
      return;
    }

    // Download PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      console.error(`Failed to download PDF: ${pdfResponse.statusText}`);
      metrics.putMetric(PDF_EXTRACT_SUCCESS_METRIC, 0, Unit.Count);
      return;
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // Save PDF to S3
    const pdfKey = `${Date.now()}.pdf`;
    await S3.send(
      new PutObjectCommand({
        Bucket: process.env.PDF_BUCKET,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      })
    );

    metrics.putMetric(PDF_EXTRACT_SUCCESS_METRIC, 1, Unit.Count);
    console.log(
      `Successfully saved PDF to ${process.env.PDF_BUCKET}/${pdfKey}`
    );
  }
);

async function fetchEmailFromS3(event: AWSLambda.S3Event): Promise<string> {
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

  return data.Body.transformToString();
}

function extractPdfUrl(emailText: string): string | null {
  const urlMatch = emailText.match(
    /https:\/\/www\.amazon\.co\.uk\/gp\/f\.html\?.*?(?:&U=)(.*?)(?:&|$)/i
  );
  if (!urlMatch) {
    return null;
  }
  return decodeURIComponent(urlMatch[1]);
}
