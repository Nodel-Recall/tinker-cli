import "dotenv/config";

import {
  createCloudFormationClient,
  createStack,
  waitStackComplete,
  setupProjectStackParams,
  maxWaitProjectStackTime,
  ruleNumberOffset,
  maxRuleNumber,
  projectTemplate,
  emptyTemplate,
} from "../utils/awsHelpers.js";

import { readTemplateFromFile, encoding } from "../utils/fileHelpers.js";

import {
  insertProjectAdminTable,
  getNextProjectId,
} from "../utils/services.js";

import {
  log,
  err,
  tinkerGreen,
  createSpinner,
  getProjectDetails,
  getInstanceType,
} from "../utils/ui.js";
import { generateJWT } from "../utils/jwtHelpers.js";

const postgrestPort = 3000;
const spinner = createSpinner(
  "Deploying to AWS... This may take up to 15 minutes!"
);
const templatePath = process.env.DEVELOPMENT ? emptyTemplate : projectTemplate;

const create = async ({ name, instance }) => {
  try {
    const TemplateBody = await readTemplateFromFile(templatePath, encoding);

    let StackName;
    if (!name) {
      StackName = await getProjectDetails();
    } else {
      StackName = name;
    }

    let InstanceType;
    if (!instance) {
      InstanceType = await getInstanceType();
    } else {
      InstanceType = instance;
    }

    const cloudFormation = createCloudFormationClient(process.env.REGION);
    const jwt = await generateJWT(process.env.SECRET);
    const ProjectId = Number(await getNextProjectId(jwt, process.env.DOMAIN));
    const RulePriority = (ProjectId + ruleNumberOffset) % maxRuleNumber;

    const stackParams = setupProjectStackParams(
      StackName,
      TemplateBody,
      RulePriority,
      InstanceType
    );

    spinner.start();

    await createStack(cloudFormation, stackParams);
    await waitStackComplete(cloudFormation, StackName, maxWaitProjectStackTime);
    await insertProjectAdminTable(jwt, StackName, process.env.DOMAIN);

    spinner.succeed("Creation complete!");
    log("");
    log(
      `Project backend: ${tinkerGreen(
        `https://${StackName}.${process.env.DOMAIN}:${postgrestPort}`
      )}`
    );

    process.exit(0);
  } catch (error) {
    spinner.fail("Deployment failed!");
    err(error);

    process.exit(1);
  }
};

export default create;
