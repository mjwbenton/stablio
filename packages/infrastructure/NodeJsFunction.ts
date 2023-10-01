import { buildSync } from "esbuild";
import { Construct } from "constructs";
import { TerraformAsset, AssetType } from "cdktf";
import { resolve, join } from "path";
import * as aws from "@cdktf/provider-aws";
import { Namer } from "./Namer";

const LAMBDA_ROLE_POLICY = {
  Version: "2012-10-17",
  Statement: [
    {
      Action: "sts:AssumeRole",
      Principal: {
        Service: "lambda.amazonaws.com",
      },
      Effect: "Allow",
      Sid: "",
    },
  ],
};

export interface NodejsFunctionProps {
  handler: string;
  path: string;
}

const bundle = (workingDirectory: string) => {
  buildSync({
    entryPoints: ["index.ts"],
    platform: "node",
    target: "node18",
    bundle: true,
    format: "cjs",
    sourcemap: "external",
    outdir: "dist",
    absWorkingDir: workingDirectory,
  });

  return join(workingDirectory, "dist");
};

export class NodejsFunction extends Construct {
  readonly lambda: aws.lambdaFunction.LambdaFunction;
  readonly role: aws.iamRole.IamRole;

  constructor(
    scope: Construct,
    id: string,
    { handler, path }: NodejsFunctionProps,
  ) {
    super(scope, id);
    const namer = new Namer(this, id);

    const workingDirectory = resolve(path);
    const distPath = bundle(workingDirectory);

    const asset = new TerraformAsset(this, "asset", {
      path: distPath,
      type: AssetType.ARCHIVE,
    });

    const bucket = new aws.s3Bucket.S3Bucket(this, "bucket", {
      bucket: namer.lower("bucket"),
    });

    const assetPath = `${asset.assetHash}/${asset.fileName}`;

    const codeInBucket = new aws.s3Object.S3Object(this, "code-in-bucket", {
      bucket: bucket.bucket,
      key: assetPath,
      source: asset.path,
    });

    this.role = new aws.iamRole.IamRole(this, "role", {
      name: namer.name("role"),
      assumeRolePolicy: JSON.stringify(LAMBDA_ROLE_POLICY),
    });

    new aws.iamRolePolicyAttachment.IamRolePolicyAttachment(
      this,
      "lambda-managed-policy",
      {
        policyArn:
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        role: this.role.name,
      },
    );

    this.lambda = new aws.lambdaFunction.LambdaFunction(this, "lambda", {
      functionName: namer.name("lambda"),
      s3Bucket: codeInBucket.bucket,
      s3Key: codeInBucket.key,
      role: this.role.arn,
      runtime: "nodejs18.x",
      handler,
    });
  }
}
