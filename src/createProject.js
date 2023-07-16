import axios from "axios";
import "dotenv/config";

import {
  readTemplateFromFile,
  createCloudFormationClient,
  createStack,
  waitStack,
  getStackOutputs,
  setupProjectStackParams,
} from "../utils/awsHelpers.js";

import { log, err, createSpinner } from "../utils/ui.js";
import { generateJWT } from "../utils/generateJWT.js";
import { getProjectName } from "../utils/getProjectName.js";

import {
  adminStackName,
  encoding,
  maxWaitProjectStackTime,
  ruleNumberOffset,
  maxRuleNumber,
  awsStackOutputKeyTinkerRegion,
  awsStackOutputKeyTinkerDomainName,
  awsStackOutputKeyTinkerAdminDomain,
  projectTemplate,
  emptyTemplate,
} from "../utils/constants.js";

const spinner = createSpinner(
  "Deploying to AWS... This may take up to 15 minutes!"
);

const templatePath = process.env.DEVELOPMENT ? emptyTemplate : projectTemplate;

const getRegion = (stackOutputs) => {
  return stackOutputs.find((o) => o.OutputKey === awsStackOutputKeyTinkerRegion)
    .OutputValue;
};
const getAdminDomain = (stackOutputs) => {
  return stackOutputs.find(
    (o) => o.OutputKey === awsStackOutputKeyTinkerAdminDomain
  ).OutputValue;
};

const getDomain = async (stackOutputs) => {
  return stackOutputs.find(
    (o) => o.OutputKey === awsStackOutputKeyTinkerDomainName
  ).OutputValue;
};

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
  const adminDomain = await getAdminDomain(adminStackOutputs);
  const domain = await getDomain(adminStackOutputs);
  const region = await getRegion(adminStackOutputs);

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
