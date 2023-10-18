import { Construct } from "constructs";
import { S3Backend, TerraformStack } from "cdktf";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";
import { NodejsFunction } from "./NodeJsFunction";
import * as path from "path";

export class StablioIngestionStack extends TerraformStack {
  readonly lambda: aws.lambdaFunction.LambdaFunction;
  readonly lambdaRole: aws.iamRole.IamRole;

  constructor(
    scope: Construct,
    name: string,
    {
      databaseSecret,
    }: { databaseSecret: aws.secretsmanagerSecret.SecretsmanagerSecret },
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

    const nodeJsFunction = new NodejsFunction(this, "LambdaCode", {
      path: path.join(__dirname, "..", "ingestion-lambda"),
      handler: "index.handler",
      environment: {
        DATABASE_SECRET: databaseSecret.id,
      },
    });

    this.lambda = nodeJsFunction.lambda;
    this.lambdaRole = nodeJsFunction.role;
  }
}
