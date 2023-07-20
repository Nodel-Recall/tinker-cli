import fs from "fs/promises";
import "dotenv/config";

import {
  createCloudFormationClient,
  deleteStack,
  adminStackName,
  maxWaitAdminStackTime,
  waitStackDeleteComplete,
  maxWaitProjectStackTime,
  deleteKeys,
} from "../utils/awsHelpers.js";

import { log, err, createSpinner, confirmInput } from "../utils/ui.js";
import { generateJWT } from "../utils/jwtHelpers.js";
import { getAllProjects } from "../utils/services.js";
import { configFile, sshPrivateKey } from "../utils/fileHelpers.js";

const spinner = createSpinner("Tearing down Tinker...");

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

async function exists(path) {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

const destroy = async ({ force }) => {
  try {
    let confirmed;
    if (!force) {
      confirmed = await confirmInput("Are you sure?");
    } else {
      confirmed = true;
    }

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
    await deleteKeys(process.env.REGION);

    await fs.writeFile(configFile, "");

    const fileExists = await exists(sshPrivateKey);
    if (fileExists) {
      await fs.unlink(sshPrivateKey);
    }

    spinner.succeed("Teardown complete!");
    log("");
    log("Tinker deleted successfully!");
  } catch (error) {
    spinner.fail("Teardown failed!");
    err(error);

    process.exit(1);
  }
};

export default destroy;
