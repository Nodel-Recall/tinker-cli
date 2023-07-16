import {
  CloudFormationClient,
  CreateStackCommand,
  waitUntilStackCreateComplete,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

import {
  EC2Client,
  CreateKeyPairCommand,
  DescribeKeyPairsCommand,
} from "@aws-sdk/client-ec2";

import fs from "fs/promises";

export const awsRegions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-northeast-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ca-central-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "me-south-1",
  "sa-east-1",
];

const tinkerKeyName = "tinker_keys";

export const readTemplateFromFile = async (templatePath, encoding) => {
  const template = await fs.readFile(templatePath, encoding);
  return template;
};

export const createCloudFormationClient = (region) => {
  return new CloudFormationClient({ region });
};

export const createStack = async (cloudFormation, stackParams) => {
  const command = new CreateStackCommand(stackParams);
  await cloudFormation.send(command);
};

export const waitStack = async (cloudFormation, stackName, maxWaitTime) => {
  const waiterParams = {
    client: cloudFormation,
    maxWaitTime,
  };

  const describeStacksCommandInput = {
    StackName: stackName,
  };

  await waitUntilStackCreateComplete(waiterParams, describeStacksCommandInput);
};

export const getStackOutputs = async (cloudFormation, stackName) => {
  const describeStacksCommandInput = {
    StackName: stackName,
  };

  const describeStacksCommandOutput = await cloudFormation.send(
    new DescribeStacksCommand(describeStacksCommandInput)
  );

  const stack = describeStacksCommandOutput.Stacks[0];
  return stack.Outputs;
};

export const updateConfigurationFiles = async (Domain, secret, region) => {
  await fs.writeFile(".env", "");
  await fs.appendFile(".env", `DOMAIN_NAME=${Domain}\n`);
  await fs.appendFile(".env", `SECRET=${secret}\n`);
  await fs.appendFile(".env", `ADMIN_REGION=${region}`);
};

export const setupAdminStackParams = (
  StackName,
  TemplateBody,
  Domain,
  HostedZoneId,
  Secret
) => {
  let WildcardSubdomainName = `*.${Domain}`;
  let AdminDomain = `admin.${Domain}`;

  return {
    StackName,
    TemplateBody,
    Parameters: [
      {
        ParameterKey: "Secret",
        ParameterValue: Secret,
      },
      {
        ParameterKey: "WildcardSubdomainName",
        ParameterValue: WildcardSubdomainName,
      },
      {
        ParameterKey: "Domain",
        ParameterValue: Domain,
      },
      {
        ParameterKey: "AdminDomain",
        ParameterValue: AdminDomain,
      },
      {
        ParameterKey: "HostedZoneId",
        ParameterValue: HostedZoneId,
      },
    ],
  };
};

export const setupProjectStackParams = (
  StackName,
  TemplateBody,
  RulePriority
) => {
  return {
    StackName,
    TemplateBody,
    Parameters: [
      {
        ParameterKey: "ProjectName",
        ParameterValue: StackName,
      },
      {
        ParameterKey: "RulePriority",
        ParameterValue: RulePriority,
      },
    ],
  };
};

export const createKeys = async (region) => {
  const client = new EC2Client({ region });
  const keysExist = await doTinkerKeysExist(client);
  if (!keysExist) {
    const command = new CreateKeyPairCommand({ KeyName: tinkerKeyName });
    const response = await client.send(command);
    console.log("key creation response", response.KeyMaterial); //still working out what to do with the secret access key
  }
};

const doTinkerKeysExist = async (client) => {
  const command = new DescribeKeyPairsCommand({}); ///Didn't filter specifically for tinker_keys because if it isn't found, it raises an error
  const response = await client.send(command);
  for (let key of response.KeyPairs) {
    if (key.KeyName === tinkerKeyName) {
      return true;
    }
  }
  return false;
};
