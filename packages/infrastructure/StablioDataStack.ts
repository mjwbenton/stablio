import { Construct } from "constructs";
import { S3Backend, TerraformStack } from "cdktf";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";

export class StablioDataStack extends TerraformStack {
  readonly table: aws.dynamodbTable.DynamodbTable;

  constructor(scope: Construct, name: string) {
    super(scope, name);

    new S3Backend(this, {
      bucket: "mattb.tech-terraform-state",
      key: "stablio-data.tfstate",
      region: "us-east-1",
    });

    new aws.provider.AwsProvider(this, "AWS", {
      region: "eu-west-1",
    });

    new random.provider.RandomProvider(this, "random");

    this.table = new aws.dynamodbTable.DynamodbTable(this, "Table", {
      name: "stablio-data-table",
      hashKey: "book",
      attribute: [
        { name: "book", type: "S" },
        { name: "highlights", type: "L" },
      ],
      billingMode: "PAY_PER_REQUEST",
      pointInTimeRecovery: { enabled: true },
    });
  }
}
