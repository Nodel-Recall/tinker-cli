import chalk from "chalk";

import {
  CloudFormationClient,
  CreateStackCommand,
} from "@aws-sdk/client-cloudformation";
import fs from "fs";
import util from "util";
import readline from "readline";

const tinkerPurple = chalk.rgb(99, 102, 241);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const readFileAsync = util.promisify(fs.readFile);

const readTemplateFromFile = async (templatePath, encoding) => {
  try {
    let template = await readFileAsync(templatePath, encoding);
    return template;
  } catch (error) {
    console.error(chalk.red("Error reading template file:"), error);
    rl.close();
    process.exit(1);
  }
};

const promisifyRegionQuestion = () => {
  return new Promise((resolve, reject) => {
    rl.question(tinkerPurple("Enter the region: "), (answer) => {
      if (!awsRegions.includes(answer)) {
        reject(chalk.red("Invalid region"));
      }

      resolve(answer);
    });
  });
};

const askRegion = async () => {
  try {
    let region = await promisifyRegionQuestion();
    return region;
  } catch (error) {
    console.error(error);
    rl.close();
    process.exit(1);
  }
};

const awsRegions = [
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
const stackName = "TinkerALBStack";
const templatePath = "./tinker_ALB_template.json";
const encoding = "utf8";

const template = await readTemplateFromFile(templatePath, encoding);
const region = await askRegion();

const cloudFormationClient = new CloudFormationClient({ region });

// TODO: Remove hardcoded values
const createStackParams = {
  StackName: stackName,
  TemplateBody: template,
  Parameters: [
    {
      ParameterKey: "TinkerVPCId",
      ParameterValue: "vpc-0123c8b9365a817e5",
    },
    {
      ParameterKey: "TinkerAdminSubnetId",
      ParameterValue: "subnet-045ca0e9c5efdce0b",
    },
    {
      ParameterKey: "TinkerAdminAppEC2Id",
      ParameterValue: "i-018d836b33ac7069a",
    },
    {
      ParameterKey: "SubdomainName",
      ParameterValue: "*.wshosugihara.com",
    },
    {
      ParameterKey: "AdminSubdomain",
      ParameterValue: "admin.wshosugihara.com",
    },
    {
      ParameterKey: "HostedZoneName",
      ParameterValue: "wshosugihara.com.",
    },
     {
      ParameterKey: "HostedZoneId",
      ParameterValue: "Z02497723PKJWYU1J9N4A",
    },
  ],
};

const createStackCommand = new CreateStackCommand(createStackParams);

const createStack = async (cloudFormationClient, createStackCommand) => {
  try {
    const createStackResponse = await cloudFormationClient.send(
      createStackCommand
    );
    console.log("Stack creation initiated:", createStackResponse.StackId);
  } catch (error) {
    console.error("Error creating stack:", error);
    process.exit(1);
  }
};

// Call the createStack function
await createStack(cloudFormationClient, createStackCommand);

process.exit(0);
