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
import { log, err, createSpinner } from "../utils/ui.js";
import { generateJWT } from "../utils/jwtHelpers.js";
import { getProjectName } from "../utils/getProjectName.js";

const spinner = createSpinner(
  "Deploying to AWS... This may take up to 15 minutes!"
);

const templatePath = process.env.DEVELOPMENT ? emptyTemplate : projectTemplate;

try {
  const TemplateBody = await readTemplateFromFile(templatePath, encoding);
  const StackName = await getProjectName();
  const cloudFormation = createCloudFormationClient(process.env.REGION);
  const jwt = await generateJWT(process.env.SECRET);
  const ProjectId = Number(await getNextProjectId(jwt, process.env.DOMAIN));
  const RulePriority = (ProjectId + ruleNumberOffset) % maxRuleNumber;

  const stackParams = setupProjectStackParams(
    StackName,
    TemplateBody,
    RulePriority
  );

  spinner.start();

  await createStack(cloudFormation, stackParams);
  await waitStackComplete(cloudFormation, StackName, maxWaitProjectStackTime);
  await insertProjectAdminTable(jwt, StackName, process.env.DOMAIN);

  spinner.succeed("Deployment complete!");
  log("");
  log("Project created successfully!");

  process.exit(0);
} catch (error) {
  spinner.fail("Deployment failed!");
  err(error);

  process.exit(1);
}
