import chalk from "chalk";
const tinkerPurple = chalk.rgb(99, 102, 241);
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const validProjectName = (projectName) => {
  if (whiteSpace(projectName)) return false;
  const match = projectName.match(/^[a-zA-Z][a-zA-Z0-9-]+$/g);
  if (!match) {
    return false;
  }
  return match[0] === projectName;
};

const whiteSpace = (projectName) => {
  const trimmed = projectName.replace(" ", "");
  if (trimmed === projectName) {
    return false;
  }
  return true;
};

const promisifyProjectNameQuestion = () => {
  return new Promise((resolve, reject) => {
    rl.question(
      tinkerPurple(
        "Enter Project Name (alphanumeric chars and hyphens only): "
      ),
      (answer) => {
        if (!validProjectName(answer)) {
          reject(
            chalk.red(
              "Invalid Name. Alphanumeric chars and hyphens only. Name must start with an alphanumeric char."
            )
          );
        }
        resolve(answer);
      }
    );
  });
};

export const getProjectName = async () => {
  try {
    return await promisifyProjectNameQuestion();
  } catch (error) {
    console.log("error getting project name input", error);
  }
};
