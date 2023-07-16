import axios from "axios";
import "dotenv/config";

import {
  createCloudFormationClient,
  createStack,
  waitStack,
  getStackOutputs,
  getStackOutputFromKey,
  setupProjectStackParams,
  adminStackName,
  maxWaitProjectStackTime,
  ruleNumberOffset,
  maxRuleNumber,
  projectTemplate,
  emptyTemplate,
  stackOutputKeyTinkerDomainName,
  stackOutputKeyTinkerAdminDomain,
  stackOutputKeyTinkerRegion,
} from "../utils/awsHelpers.js";

import { readTemplateFromFile, encoding } from "../utils/fileHelpers.js";

import { log, err, createSpinner } from "../utils/ui.js";
import { generateJWT } from "../utils/generateJWT.js";
import { getProjectName } from "../utils/getProjectName.js";

const spinner = createSpinner(
  "Deploying to AWS... This may take up to 15 minutes!"
);

const templatePath = process.env.DEVELOPMENT ? emptyTemplate : projectTemplate;

const updateProjectsTable = async (jwt, StackName, domain, adminDomain) => {
  await axios.post(
    `https://${adminDomain}:3000/projects`,
    { name: StackName, domain: `${StackName}.${domain}` },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
};

const getNextProjectId = async (jwt, adminDomain) => {
  const response = await axios.post(
    `https://${adminDomain}:3000/rpc/get_next_project_id`,
    null,
    {
      headers: { Authorization: `Bearer ${jwt}` },
    }
  );

  return response.data;
};

try {
  const TemplateBody = await readTemplateFromFile(templatePath, encoding);
  const StackName = await getProjectName();

  const adminRegion = process.env.ADMIN_REGION;
  const cloudFormationAdminRegion = createCloudFormationClient(adminRegion);

  let adminStackOutputs = await getStackOutputs(
    cloudFormationAdminRegion,
    adminStackName
  );

  const adminDomain = await getStackOutputFromKey(adminStackOutputs, stackOutputKeyTinkerAdminDomain);
  const domain = await getStackOutputFromKey(adminStackOutputs, stackOutputKeyTinkerDomainName);
  const region = await getStackOutputFromKey(adminStackOutputs, stackOutputKeyTinkerRegion);

  const jwt = await generateJWT(process.env.SECRET);
  const ProjectId = Number(await getNextProjectId(jwt, adminDomain));

  const RulePriority = (ProjectId + ruleNumberOffset) % maxRuleNumber;
  const stackParams = setupProjectStackParams(
    StackName,
    TemplateBody,
    RulePriority
  );
  const cloudFormation = createCloudFormationClient(region);

  spinner.start();

  await createStack(cloudFormation, stackParams);
  await waitStack(cloudFormation, StackName, maxWaitProjectStackTime);
  await updateProjectsTable(jwt, StackName, domain, adminDomain);

  spinner.succeed("Deployment complete!");
  log("");
  log("Your project was created successfully!");

  process.exit(0);
} catch (error) {
  spinner.fail("Deployment failed!");
  err(error);

  process.exit(1);
}
