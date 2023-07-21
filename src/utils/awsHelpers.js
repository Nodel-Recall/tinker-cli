import fs from "fs/promises";

import {
  CloudFormationClient,
  CreateStackCommand,
  waitUntilStackCreateComplete,
  DescribeStacksCommand,
  DeleteStackCommand,
  waitUntilStackDeleteComplete,
} from "@aws-sdk/client-cloudformation";

import {
  EC2Client,
  CreateKeyPairCommand,
  DeleteKeyPairCommand,
  DescribeKeyPairsCommand,
} from "@aws-sdk/client-ec2";

import { sshPrivateKey } from "./fileHelpers.js";

import path from "path";
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(path.dirname(import.meta.url));
export const emptyTemplate = path.resolve(__dirname, "../templates/empty.json");
export const projectTemplate = path.resolve(__dirname, "../templates/project.json");
export const adminTemplate = path.resolve(__dirname, "../templates/admin.json");

export const adminStackName = "TinkerAdminStack";
export const maxWaitProjectStackTime = 900;
export const maxWaitAdminStackTime = 900;

// ALB listener rules must have unique priorities from 1-50000
// Rule for admin is 1, so projects must be offset
// Rule number is determined from projects' primary key
export const ruleNumberOffset = 1;
export const maxRuleNumber = 50000;

const tinkerKeyName = sshPrivateKey.split(".")[0];

export const createCloudFormationClient = (region) => {
  return new CloudFormationClient({ region });
};

export const createStack = async (cloudFormation, stackParams) => {
  const command = new CreateStackCommand(stackParams);
  await cloudFormation.send(command);
};

export const deleteStack = async (cloudFormation, stackParams) => {
  const command = new DeleteStackCommand(stackParams);
  await cloudFormation.send(command);
};

export const waitStackComplete = async (
  cloudFormation,
  StackName,
  maxWaitTime
) => {
  const waiterParams = {
    client: cloudFormation,
    maxWaitTime,
  };

  const describeStacksCommandInput = {
    StackName: StackName,
  };

  await waitUntilStackCreateComplete(waiterParams, describeStacksCommandInput);
};

export const waitStackDeleteComplete = async (
  cloudFormation,
  StackName,
  maxWaitTime
) => {
  const waiterParams = {
    client: cloudFormation,
    maxWaitTime,
  };

  const describeStacksCommandInput = {
    StackName: StackName,
  };

  await waitUntilStackDeleteComplete(waiterParams, describeStacksCommandInput);
};

export const getStackOutputs = async (cloudFormation, StackName) => {
  const describeStacksCommandInput = {
    StackName: StackName,
  };

  const describeStacksCommandOutput = await cloudFormation.send(
    new DescribeStacksCommand(describeStacksCommandInput)
  );

  const stack = describeStacksCommandOutput.Stacks[0];
  return stack.Outputs;
};

export const getStackOutputFromKey = (stackOutputs, key) => {
  return stackOutputs.find((o) => o.OutputKey === key).OutputValue;
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
  Secret,
  TemplateBody,
  RulePriority,
  InstanceType
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
        ParameterKey: "Secret",
        ParameterValue: Secret,
      },
      {
        ParameterKey: "RulePriority",
        ParameterValue: RulePriority,
      },
      {
        ParameterKey: "InstanceType",
        ParameterValue: InstanceType,
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

    await fs.writeFile(sshPrivateKey, response.KeyMaterial, { flag: "wx" });
  }
};

export const deleteKeys = async (region) => {
  const client = new EC2Client({ region });
  const keysExist = await doTinkerKeysExist(client);

  if (keysExist) {
    const command = new DeleteKeyPairCommand({ KeyName: tinkerKeyName });
    await client.send(command);
  }
};

const doTinkerKeysExist = async (client) => {
  const command = new DescribeKeyPairsCommand({});
  const response = await client.send(command);

  for (let key of response.KeyPairs) {
    if (key.KeyName === tinkerKeyName) {
      return true;
    }
  }

  return false;
};
