import { S3Backend, TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";
import { NodejsFunction } from "./NodeJsFunction";
import * as path from "path";

export class StablioApiStack extends TerraformStack {
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
      key: "stablio-api.tfstate",
      region: "us-east-1",
    });

    new aws.provider.AwsProvider(this, "AWS", {
      region: "eu-west-1",
    });

    new random.provider.RandomProvider(this, "random");

    const nodeJsFunction = new NodejsFunction(this, "LambdaCode", {
      path: path.join(__dirname, "..", "api-lambda"),
      handler: "index.handler",
      environment: {
        DATABASE_SECRET: databaseSecret.id,
      },
    });

    const functionUrl = nodeJsFunction.addFunctionUrl();

    new TerraformOutput(this, "FunctionUrl", {
      value: functionUrl.functionUrl,
    });
  }
}
