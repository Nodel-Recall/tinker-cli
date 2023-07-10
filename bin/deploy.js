#! /usr/bin/env node
// TODO: Update to AWS SDK V3 with native promise API
// TODO: Console log stack creation events

import chalk from "chalk";
import ora from "ora";

import {
  CloudFormation,
  waitUntilStackCreateComplete,
} from "@aws-sdk/client-cloudformation";
import fs from "fs";
import util from "util";
import readline from "readline";
import cryptoRandomString from "crypto-random-string";

const spinner = ora({
  text: "Deploying to AWS... This may take up to 15 minutes!",
  color: "cyan",
});

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

const promisifyDomainQuestion = () => {
  return new Promise((resolve, reject) => {
    rl.question(tinkerPurple("Enter the domain: "), (answer) => {
      if (!isValidDomain(answer)) {
        reject(chalk.red("Invalid domain"));
      }
      resolve(answer);
    });
  });
};

const isValidDomain = (domain) => {
  const regex = /^(?!:\/\/)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;
  return regex.test(domain);
};

const askDomain = async () => {
  try {
    let domain = await promisifyDomainQuestion();
    return domain;
  } catch (error) {
    console.error(error);
    rl.close();
    process.exit(1);
  }
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

const createStack = async (cloudFormation, stackParams, spinner) => {
  try {
    spinner.start();

    const data = await promisifyCreateStack(cloudFormation, stackParams);
  } catch (error) {
    setTimeout(() => {
      spinner.fail("Deployment failed!");
    }, 1000);

    console.error(chalk.red("Error creating stack:"), error);
    process.exit(1);
  }
};

let template = await readTemplateFromFile(templatePath, encoding);
let region = await askRegion();
let domain = await askDomain();

let secret = cryptoRandomString({
  length: minSecretLength,
  type: "alphanumeric",
});

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

const waitStack = async (cloudFormation, stackName, spinner) => {
  const waiterParams = {
    client: cloudFormation,
    maxWaitTime: 900,
  };

  const describeStacksCommandInput = {
    StackName: stackName,
  };

  try {
    await waitUntilStackCreateComplete(
      waiterParams,
      describeStacksCommandInput
    );

    spinner.succeed("Deployment complete!");
  } catch (error) {
    spinner.fail("Deployment failed!");

    console.error(chalk.red("Error waiting for stack to complete"), error);
    process.exit(1);
  }
};

const promisifyDescribeStack = async (cloudFormation, stackParams) => {
  return new Promise((resolve, reject) => {
    cloudFormation.describeStacks(stackParams, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

const appendFileAsync = util.promisify(fs.appendFile);

const writeDomainToFile = async () => {
  try {
    await appendFileAsync(".env", `DOMAIN_NAME=${domain}`);
  } catch (error) {
    console.error(error);
    console.log("Error saving configuration to file.");
  }
};

const writeSecretToFile = async () => {
  try {
    await appendFileAsync(".env", `\nSECRET=${secret}`);
  } catch (error) {
    console.error(error);
    console.log("Error saving configuration to file.");
  }
};

const retrieveStackOutputs = async (cloudFormation, stackParams, spinner) => {
  try {
    let data = await promisifyDescribeStack(cloudFormation, stackParams);
    const stack = data.Stacks[0];
    const outputs = stack.Outputs;

    const url = outputs.find((o) => o.OutputKey === "URL").OutputValue;
    return url;
  } catch (error) {
    spinner.fail("Deployment failed!");

    console.error(chalk.red("Error creating stack:"), error);
    process.exit(1);
  }
};

const updateConfigurationFiles = async () => {
  await writeDomainToFile();
  await writeSecretToFile();
};

await createStack(cloudFormation, stackParams, spinner);
await waitStack(cloudFormation, stackName, spinner);

let adminAppURL = await retrieveStackOutputs(cloudFormation, {
  StackName: stackName,
});

await updateConfigurationFiles();

console.log();
console.log(tinkerPurple(`Your admin portal: ${chalk.green(adminAppURL)}`));
console.log(
  tinkerPurple(`Your secret to create accounts: ${chalk.green(secret)}`)
);

process.exit(0);
