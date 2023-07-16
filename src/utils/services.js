import axios from "axios";

export const getAllProjects = async (jwt, domain) => {
    const response = await axios.get(`https://admin.${domain}:3000/projects`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    return response.data.map((project) => project.name);

};
export const insertProjectAdminTable = async (jwt, StackName, domain) => {
  await axios.post(
    `https://admin.${domain}:3000/projects`,
    { name: StackName, domain: `${StackName}.${domain}` },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
};

export const getNextProjectId = async (jwt, domain) => {
  const response = await axios.post(
    `https://admin.${domain}:3000/rpc/get_next_project_id`,
    null,
    {
      headers: { Authorization: `Bearer ${jwt}` },
    }
  );

  return response.data;
};

export const deleteProjectAdminTable = async (jwt, StackName, domain) => {
  await axios.delete(
    `https://admin.${domain}:3000/projects?name=eq.${StackName}`,
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
};
