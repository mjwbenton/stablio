import { Construct } from "constructs";
import { S3Backend, TerraformStack, TerraformOutput } from "cdktf";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";
import { NodejsFunction } from "./NodeJsFunction";
import * as path from "path";

export class StablioIngestionStack extends TerraformStack {
  readonly pdfProcessLambda: aws.lambdaFunction.LambdaFunction;
  readonly pdfProcessLambdaRole: aws.iamRole.IamRole;
  readonly emailParseLambda: aws.lambdaFunction.LambdaFunction;
  readonly emailParseLambdaRole: aws.iamRole.IamRole;
  readonly pdfBucket: aws.s3Bucket.S3Bucket;

  constructor(
    scope: Construct,
    name: string,
    {
      databaseSecret,
    }: { databaseSecret: aws.secretsmanagerSecret.SecretsmanagerSecret }
  ) {
    super(scope, name);

    new S3Backend(this, {
      bucket: "mattb.tech-terraform-state",
      key: "stablio-ingestion.tfstate",
      region: "us-east-1",
    });

    new aws.provider.AwsProvider(this, "AWS", {
      region: "eu-west-1",
    });

    new random.provider.RandomProvider(this, "random");

    this.pdfBucket = new aws.s3Bucket.S3Bucket(this, "PdfBucket", {
      bucketPrefix: "stablio-pdf-bucket",
    });

    // Create the email parse lambda that extracts PDFs from emails
    const emailParseFunction = new NodejsFunction(this, "EmailParseLambda", {
      path: path.join(__dirname, "..", "email-parse-lambda"),
      handler: "index.handler",
      environment: {
        PDF_BUCKET: this.pdfBucket.bucket,
      },
    });

    // Give email parse lambda permission to write to PDF bucket
    new aws.iamRolePolicy.IamRolePolicy(
      this,
      "EmailParseWritePdfBucketPolicy",
      {
        role: emailParseFunction.role.name,
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["s3:PutObject"],
              Resource: [this.pdfBucket.arn + "/*"],
            },
          ],
        }),
      }
    );

    this.emailParseLambda = emailParseFunction.lambda;
    this.emailParseLambdaRole = emailParseFunction.role;

    // Create the PDF process lambda that handles PDFs and writes to the database
    const pdfProcessFunction = new NodejsFunction(this, "PdfProcessLambda", {
      path: path.join(__dirname, "..", "pdf-process-lambda"),
      handler: "index.handler",
      environment: {
        DATABASE_SECRET: databaseSecret.id,
      },
    });

    new aws.iamRolePolicy.IamRolePolicy(
      this,
      "PdfProcessReadDatabaseSecretPolicy",
      {
        role: pdfProcessFunction.role.name,
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["secretsmanager:GetSecretValue"],
              Resource: [databaseSecret.arn],
            },
          ],
        }),
      }
    );

    this.pdfProcessLambda = pdfProcessFunction.lambda;
    this.pdfProcessLambdaRole = pdfProcessFunction.role;

    // Add function URL for manual PDF processing
    const functionUrl = pdfProcessFunction.addFunctionUrl();
    new TerraformOutput(this, "PdfProcessFunctionUrl", {
      value: functionUrl.functionUrl,
    });

    // Subscribe the PDF process lambda to the PDF bucket
    this.subscribeLambdaToPdfUploads(this, "PdfProcess", {
      lambda: this.pdfProcessLambda,
      lambdaRole: this.pdfProcessLambdaRole,
    });
  }

  private subscribeLambdaToPdfUploads(
    scope: Construct,
    id: string,
    {
      lambda,
      lambdaRole,
    }: {
      lambda: aws.lambdaFunction.LambdaFunction;
      lambdaRole: aws.iamRole.IamRole;
    }
  ) {
    new aws.s3BucketNotification.S3BucketNotification(
      scope,
      `${id}BucketNotification`,
      {
        bucket: this.pdfBucket.bucket,
        lambdaFunction: [
          {
            lambdaFunctionArn: lambda.arn,
            events: ["s3:ObjectCreated:*"],
          },
        ],
      }
    );
    new aws.lambdaPermission.LambdaPermission(scope, `${id}Permission`, {
      functionName: lambda.functionName,
      action: "lambda:InvokeFunction",
      principal: "s3.amazonaws.com",
      sourceArn: this.pdfBucket.arn,
    });
    new aws.iamRolePolicy.IamRolePolicy(scope, `${id}ReadS3Permission`, {
      role: lambdaRole.name,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:ListBucket"],
            Resource: [this.pdfBucket.arn + "/*"],
          },
        ],
      }),
    });
  }
}
