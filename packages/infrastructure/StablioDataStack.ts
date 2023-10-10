import { Construct } from "constructs";
import { S3Backend, TerraformStack } from "cdktf";

export class StablioDataStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new S3Backend(this, {
      bucket: "mattb.tech-terraform-state",
      key: "stablio-data.tfstate",
      region: "us-east-1",
    });


    new random.provider.RandomProvider(this, "random");
  }
}
