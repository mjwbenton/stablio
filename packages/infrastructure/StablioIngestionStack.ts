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
    { dataTable }: { dataTable: aws.dynamodbTable.DynamodbTable },
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
        DATA_TABLE: dataTable.name,
      },
    });

    this.lambda = nodeJsFunction.lambda;
    this.lambdaRole = nodeJsFunction.role;

    new aws.iamRolePolicy.IamRolePolicy(this, "DynamoWritePolicy", {
      role: this.lambdaRole.name,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
            ],
            Resource: dataTable.arn,
          },
        ],
      }),
    });
  }
}
