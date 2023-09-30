import { Construct } from "constructs";
import { S3Backend, TerraformStack } from "cdktf";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";
import { NodejsFunction } from "./NodeJsFunction";
import * as path from "path";

export class StablioIngestionStack extends TerraformStack {
  constructor(scope: Construct, name: string, args: { bucket: aws.s3Bucket.S3Bucket }) {
    super(scope, name);

    new S3Backend(this, {
      bucket: "mattb.tech-terraform-state",
      key: "stablio-ingestion.tfstate",
      region: "us-east-1",
    })

    new aws.provider.AwsProvider(this, "AWS", {
      region: "eu-west-1"
    });

    new random.provider.RandomProvider(this, "random");

    const nodeJsFunction = new NodejsFunction(this, "LambdaCode", {
       path: path.join(__dirname, "..", "ingestion-lambda"),
       handler: "index.handler"
    });

    /*new aws.s3BucketNotification.S3BucketNotification(this, 'BucketNotification', {
      bucket: args.bucket.bucket,
      lambdaFunction: [{
        lambdaFunctionArn: lambdaFunction.arn,
        events: ['s3:ObjectCreated:*'],
      }],
    });*/
  }
}
