import chalk from "chalk";
import ora from "ora";
import {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStacksCommand,
  waitUntilStackCreateComplete,
} from "@aws-sdk/client-cloudformation";
import fs from "fs/promises";
import readline from "readline";
import cryptoRandomString from "crypto-random-string";
import { createKeys } from "../utils/createKeys.js";

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

const StackName = "TinkerAdminStack";
const minSecretLength = 35;
const templatePath = "./tinker_admin_template.json";
const encoding = "utf8";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const readTemplateFromFile = async (templatePath, encoding) => {
  try {
    const template = await fs.readFile(templatePath, encoding);
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

const promisifyHostedZoneIdQuestion = () => {
  return new Promise((resolve, reject) => {
    rl.question(
      tinkerPurple("Enter the domain's Hosted Zone Id: "),
      (answer) => {
        resolve(answer);
      }
    );
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

const askHostedZoneId = async () => {
  try {
    let hostedZoneId = await promisifyHostedZoneIdQuestion();
    return hostedZoneId;
  } catch (error) {
    console.error(error);
    rl.close();
    process.exit(1);
  }
};

const createStack = async (cloudFormation, stackParams, spinner) => {
  try {
    spinner.start();
    const command = new CreateStackCommand(stackParams);
    await cloudFormation.send(command);
  } catch (error) {
    setTimeout(() => {
      spinner.fail("Deployment failed!");
    }, 1000);

    console.error(chalk.red("Error creating stack:"), error);
    process.exit(1);
  }
};

const updateConfigurationFiles = async (Domain, secret) => {
  try {
    await fs.appendFile(".env", `DOMAIN_NAME=${Domain}`);
    await fs.appendFile(".env", `\nSECRET=${secret}`);
  } catch (error) {
    console.error(error);
    console.log("Error saving configuration to file.");
  }
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
    console.log("Timed out waiting for Stack to complete.");
    process.exit(1);
  }
};

const TemplateBody = await readTemplateFromFile(templatePath, encoding);
const region = await askRegion();
const Domain = await askDomain();
const HostedZoneId = await askHostedZoneId();

let WildcardSubdomainName = `*.${Domain}`;
let AdminDomain = `admin.${Domain}`;

let Secret = cryptoRandomString({
  length: minSecretLength,
  type: "alphanumeric",
});

const stackParams = {
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

const cloudFormation = new CloudFormationClient({ region });
await createKeys(region);
await createStack(cloudFormation, stackParams, spinner);
await waitStack(cloudFormation, StackName, spinner);
await updateConfigurationFiles(Domain, Secret);

console.log();
console.log(
  tinkerPurple(`Your admin portal: ${chalk.green(`https://${AdminDomain}`)}`)
);
console.log(
  tinkerPurple(`Your secret to create accounts: ${chalk.green(Secret)}`)
);

process.exit(0);
