import "dotenv/config";

import {
  createCloudFormationClient,
  deleteStack,
  adminStackName,
  maxWaitAdminStackTime,
  waitStackDeleteComplete,
  maxWaitProjectStackTime,
} from "../utils/awsHelpers.js";

import { log, err, createSpinner, confirmInput } from "../utils/ui.js";
import { generateJWT } from "../utils/jwtHelpers.js";
import { getAllProjects } from "../utils/services.js";

const spinner = createSpinner(
  "Tearing down Tinker..."
);

const deleteAllProjects = async (jwt, cloudFormation, adminDomain) => {
  const activeProjects = await getAllProjects(jwt, adminDomain);

  const deleteProjectPromises = activeProjects.map((project) => {
    let stackParams = { StackName: project };
    return deleteStack(cloudFormation, stackParams, process.env.DOMAIN);
  });

  await Promise.all(deleteProjectPromises);

  const waitProjectDeletionPromises = activeProjects.map((project) => {
    return waitStackDeleteComplete(
      cloudFormation,
      project,
      maxWaitProjectStackTime
    );
  });

  await Promise.all(waitProjectDeletionPromises);
};

try {
  let confirmed = await confirmInput('Are you sure?')
  if (!confirmed) {
    process.exit(0);
  }

  const cloudFormation = createCloudFormationClient(process.env.REGION);
  const stackParams = { StackName: adminStackName };
  const jwt = await generateJWT(process.env.SECRET);

  spinner.start();

  await deleteAllProjects(jwt, cloudFormation, process.env.DOMAIN);
  await deleteStack(cloudFormation, stackParams, process.env.DOMAIN);
  await waitStackDeleteComplete(
    cloudFormation,
    adminStackName,
    maxWaitAdminStackTime
  );

  spinner.succeed("Teardown complete!");
  log("");
  log("Tinker deleted successfully!");
} catch (error) {
  spinner.fail("Teardown failed!");
  err(error);

  process.exit(1);
}
