import chalk from "chalk";
import ora from "ora";

export const tinkerPurple = chalk.rgb(99, 102, 241);
export const tinkerGreen = chalk.green;
const spinnerColor = "cyan";

export const log = (msg) => {
  console.log(tinkerPurple(msg));
};

export const err = (msg) => {
  console.error(chalk.red(msg));
};

export const createSpinner = (text) => {
  return ora({
    text,
    color: spinnerColor,
  });
};
