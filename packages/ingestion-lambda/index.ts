import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import mailparser from "mailparser";

const S3 = new S3Client({});

export async function handler(event: AWSLambda.S3Event) {

    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);

    const data = await S3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }));

    if (!data.Body) {
        throw new Error("Missing data body");
    }

    const parsedEmail = await mailparser.simpleParser(await data.Body.transformToString());
    console.log(JSON.stringify(parsedEmail, null, 2));
};