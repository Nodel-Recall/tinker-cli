import {
  awsRegions,
  createCloudFormationClient,
  createStack,
  waitStack,
  setupAdminStackParams,
  createKeys,
} from "../utils/awsHelpers.js";

import { log, err, tinkerPurple, tinkerGreen } from "../utils/ui.js";

import readline from "readline";
import ora from "ora";
import fs from "fs/promises";
import cryptoRandomString from "crypto-random-string";

const spinner = ora({
  text: "Deploying to AWS... This may take up to 15 minutes!",
  color: "cyan",
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const StackName = "TinkerAdminStack";
const minSecretLength = 35;
const templatePath = "./tinker_admin_template.json";
const encoding = "utf8";
const maxWaitAdminStackTime = 900;

const promisifyRegionQuestion = () => {
  return new Promise((resolve, reject) => {
    rl.question(tinkerPurple("Enter the region: "), (answer) => {
      if (!awsRegions.includes(answer)) {
        reject("Invalid region");
      }

      resolve(answer);
    });
  });
};

const promisifyDomainQuestion = () => {
  return new Promise((resolve, reject) => {
    rl.question(tinkerPurple("Enter the domain: "), (answer) => {
      if (!isValidDomain(answer)) {
        reject("Invalid domain");
      }
      resolve(answer);
    });
  });
};

const promisifyHostedZoneIdQuestion = () => {
  return new Promise((resolve) => {
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
  let domain = await promisifyDomainQuestion();
  return domain;
};

const askRegion = async () => {
  let region = await promisifyRegionQuestion();
  return region;
};

const askHostedZoneId = async () => {
  let hostedZoneId = await promisifyHostedZoneIdQuestion();
  return hostedZoneId;
};

const logDeploySuccess = (AdminDomain, Secret) => {
  console.log();
  log(`Your admin portal: ${tinkerGreen(`https://${AdminDomain}`)}`);
  log(`Your secret to create accounts: ${tinkerGreen(Secret)}`);
};

const readTemplateFromFile = async (templatePath, encoding) => {
  const template = await fs.readFile(templatePath, encoding);
  return template;
};

const updateConfigurationFiles = async (Domain, secret) => {
  await fs.appendFile(".env", `DOMAIN_NAME=${Domain}`);
  await fs.appendFile(".env", `\nSECRET=${secret}`);
};

const Secret = cryptoRandomString({
  length: minSecretLength,
  type: "alphanumeric",
});

try {
  const TemplateBody = await readTemplateFromFile(templatePath, encoding);
  const region = await askRegion();
  const Domain = await askDomain();
  const HostedZoneId = await askHostedZoneId();

  const stackParams = setupAdminStackParams(
    StackName,
    TemplateBody,
    Domain,
    HostedZoneId,
    Secret
  );
  const cloudFormation = createCloudFormationClient(region);

  spinner.start();

  await createKeys(region);
  await createStack(cloudFormation, stackParams);
  await waitStack(cloudFormation, StackName, maxWaitAdminStackTime);
  await updateConfigurationFiles(Domain, Secret);

  spinner.succeed("Deployment complete!");
  logDeploySuccess(`admin.${Domain}`, Secret);

  process.exit(0);
} catch (error) {
  spinner.fail("Deployment failed!");
  err(error);

  process.exit(1);
} finally {
  rl.close();
}
