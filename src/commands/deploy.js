import {
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
  tinkerGreen,
  createSpinner,
  getRegion,
  getDomain,
  getHostedZoneId,
} from "../utils/ui.js";

import cryptoRandomString from "crypto-random-string";

const minSecretLength = 35;
const spinner = createSpinner(
  "Deploying to AWS... This may take up to 30 minutes!"
);

const Secret = cryptoRandomString({
  length: minSecretLength,
  type: "alphanumeric",
});

const deploy = async ({ region, domain, zone }) => {
  try {
    const TemplateBody = await readTemplateFromFile(adminTemplate, encoding);

    if (!region) {
      region = await getRegion();
    }

    let Domain;
    if (!domain) {
      Domain = await getDomain();
    } else {
      Domain = domain;
    }

    let HostedZoneId;
    if (!zone) {
      HostedZoneId = await getHostedZoneId();
    } else {
      HostedZoneId = zone;
    }

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
    await waitStackComplete(
      cloudFormation,
      adminStackName,
      maxWaitAdminStackTime
    );
    await updateConfigurationFiles(Domain, Secret, region);

    spinner.succeed("Deployment complete!");
    log("");
    log(`Admin portal: ${tinkerGreen(`https://admin.${Domain}`)}`);
    log(`Secret: ${tinkerGreen(Secret)}`);
    log("");
    log(
      `Note that it takes additional time for your new DNS records to propagate. `
    );
    log(`You won't be able to create projects until they do.`);

    process.exit(0);
  } catch (error) {
    spinner.fail("Deployment failed!");
    err(error);

    process.exit(1);
  }
};

export default deploy;
