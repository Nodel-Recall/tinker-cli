#! /usr/bin/env node
import yargs from "yargs";
import chalk from "chalk";

import {
  CloudFormation,
  RegistrationStatus,
} from "@aws-sdk/client-cloudformation";
import fs from "fs";
import util from "util";
import readline from "readline";
import cryptoRandomString from "crypto-random-string";

const tinkerPurple = chalk.rgb(99, 102, 241);

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

const stackName = "TinkerAdminStack";
const minSecretLength = 35;
const templatePath = "./tinker_admin_template.json";
const encoding = "utf8";

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

const promisifyCreateStack = async (cloudFormation, stackParams) => {
  return new Promise((resolve, reject) => {
    cloudFormation.createStack(stackParams, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

const createStack = async (cloudFormation, stackParams) => {
  try {
    const data = await promisifyCreateStack(cloudFormation, stackParams);
    console.log(tinkerPurple("Stack creation initiated:"), data.StackId);
    process.exit(0);
  } catch (err) {
    console.error(chalk.red("Error creating stack:"), err);
    process.exit(1);
  }
};

let template = await readTemplateFromFile(templatePath, encoding);
let region = await askRegion();

let secret = cryptoRandomString({
  length: minSecretLength,
  type: "alphanumeric",
});

console.log(tinkerPurple("Your secret is"), secret);

const cloudFormation = new CloudFormation({ region });

const stackParams = {
  StackName: stackName,
  TemplateBody: template,
  Parameters: [
    {
      ParameterKey: "Secret",
      ParameterValue: secret,
    },
  ],
};

await createStack(cloudFormation, stackParams);
