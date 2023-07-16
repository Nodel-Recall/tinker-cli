import {
  awsRegions,
  createCloudFormationClient,
  createStack,
  waitStackComplete,
  setupAdminStackParams,
  createKeys,
  adminStackName,
  adminTemplate,
  maxWaitAdminStackTime,
} from "../utils/awsHelpers.js";

import {
  readTemplateFromFile,
  updateConfigurationFiles,
  encoding,
} from "../utils/fileHelpers.js";

import {
  log,
  err,
  tinkerPurple,
  tinkerGreen,
  createSpinner,
} from "../utils/ui.js";

import readline from "readline";
import cryptoRandomString from "crypto-random-string";

const minSecretLength = 35;
const spinner = createSpinner(
  "Deploying to AWS... This may take up to 30 minutes!"
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

const Secret = cryptoRandomString({
  length: minSecretLength,
  type: "alphanumeric",
});

try {
  const TemplateBody = await readTemplateFromFile(adminTemplate, encoding);
  const region = await askRegion();
  const Domain = await askDomain();
  const HostedZoneId = await askHostedZoneId();

  const stackParams = setupAdminStackParams(
    adminStackName,
    TemplateBody,
    Domain,
    HostedZoneId,
    Secret
  );
  const cloudFormation = createCloudFormationClient(region);

  spinner.start();

  await createKeys(region);
  await createStack(cloudFormation, stackParams);
  await waitStackComplete(cloudFormation, adminStackName, maxWaitAdminStackTime);
  await updateConfigurationFiles(Domain, Secret, region);

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
