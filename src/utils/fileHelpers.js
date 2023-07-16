import fs from "fs/promises";

export const encoding = "utf8";

const file = ".env";

export const readTemplateFromFile = async (templatePath, encoding) => {
  const template = await fs.readFile(templatePath, encoding);
  return template;
};

export const updateConfigurationFiles = async (Domain, secret, region) => {
  await fs.writeFile(file, "");
  await fs.appendFile(file, `DOMAIN=${Domain}\n`);
  await fs.appendFile(file, `SECRET=${secret}\n`);
  await fs.appendFile(file, `REGION=${region}`);
};
