import { S3Backend, TerraformOutput, TerraformStack, Fn } from "cdktf";
import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";
import { NodejsFunction } from "./NodeJsFunction";
import * as path from "path";

const DOMAIN_NAME = "api.stablio.mattb.tech";

export class StablioApiStack extends TerraformStack {
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
      key: "stablio-api.tfstate",
      region: "us-east-1",
    });

    new aws.provider.AwsProvider(this, "AWS", {
      region: "eu-west-1",
    });

    const usEast1Provider = new aws.provider.AwsProvider(
      this,
      "AWS-us-east-1",
      {
        region: "us-east-1",
        alias: "aws-us-east-1",
      }
    );

    new random.provider.RandomProvider(this, "random");

    const nodeJsFunction = new NodejsFunction(this, "LambdaCode", {
      path: path.join(__dirname, "..", "api-lambda"),
      handler: "index.handler",
      environment: {
        DATABASE_SECRET: databaseSecret.id,
      },
    });

    new aws.iamRolePolicy.IamRolePolicy(
      this,
      "LambdaReadDatabaseSecretPolicy",
      {
        role: nodeJsFunction.role.name,
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

    const functionUrl = nodeJsFunction.addFunctionUrl();

    const certificate = new aws.acmCertificate.AcmCertificate(
      this,
      "Certificate",
      {
        provider: usEast1Provider,
        domainName: DOMAIN_NAME,
        validationMethod: "DNS",
      }
    );

    const distribution = new aws.cloudfrontDistribution.CloudfrontDistribution(
      this,
      "Distribution",
      {
        enabled: true,
        origin: [
          {
            domainName: Fn.replace(
              Fn.replace(functionUrl.functionUrl, "https://", ""),
              "/",
              ""
            ),
            originId: "lambda-origin",
            customOriginConfig: {
              httpsPort: 443,
              httpPort: 80,
              originProtocolPolicy: "https-only",
              originSslProtocols: ["TLSv1.2"],
            },
          },
        ],
        defaultCacheBehavior: {
          cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // CachingDisabled managed policy
          allowedMethods: [
            "HEAD",
            "DELETE",
            "POST",
            "GET",
            "OPTIONS",
            "PUT",
            "PATCH",
          ],
          cachedMethods: ["GET", "HEAD"],
          targetOriginId: "lambda-origin",
          viewerProtocolPolicy: "https-only",
        },
        viewerCertificate: {
          acmCertificateArn: certificate.arn,
          sslSupportMethod: "sni-only",
        },
        restrictions: {
          geoRestriction: {
            restrictionType: "none",
          },
        },
        aliases: [DOMAIN_NAME],
      }
    );

    const hostedZone = new aws.dataAwsRoute53Zone.DataAwsRoute53Zone(
      this,
      "HostedZone",
      {
        name: "mattb.tech",
        privateZone: false,
      }
    );

    new aws.route53Record.Route53Record(this, "ARecord", {
      zoneId: hostedZone.zoneId,
      name: DOMAIN_NAME,
      type: "A",
      alias: {
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: false,
      },
    });

    const validationRequirement = certificate.domainValidationOptions.get(0);

    const validationRecord = new aws.route53Record.Route53Record(
      this,
      "ValidationRecord",
      {
        zoneId: hostedZone.zoneId,
        ttl: 60,
        name: validationRequirement.resourceRecordName,
        records: [validationRequirement.resourceRecordValue],
        type: validationRequirement.resourceRecordType,
      }
    );

    new aws.acmCertificateValidation.AcmCertificateValidation(
      this,
      "CertificateValidation",
      {
        provider: usEast1Provider,
        certificateArn: certificate.arn,
        validationRecordFqdns: [validationRecord.fqdn],
      }
    );
  }
}
