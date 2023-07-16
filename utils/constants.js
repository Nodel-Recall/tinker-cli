export const adminStackName = "TinkerAdminStack";
export const encoding = "utf8";
export const maxWaitProjectStackTime = 900;
export const maxWaitAdminStackTime = 900;

// ALB listener rules must have unique priorities from 1-50000
// Rule for admin is 1, so projects must be offset
// Rule number is determined from projects' primary key
export const ruleNumberOffset = 1;
export const maxRuleNumber = 50000;

export const awsStackOutputKeyTinkerRegion = "TinkerRegion";
export const awsStackOutputKeyTinkerDomainName = "TinkerDomainName";
export const awsStackOutputKeyTinkerAdminDomain = "TinkerAdminDomain";

export const emptyTemplate = "./empty_template.json";
export const projectTemplate = "./tinker_create_project_template.json";
export const adminTemplate = "./tinker_admin_template.json";

export const minSecretLength = 35;
