import * as jose from "jose";

export const generateJWT = async (jwtSecret) => {
  const secret = new TextEncoder().encode(jwtSecret);
  const alg = "HS256";
  const jwt = await new jose.SignJWT({ role: "admin" })
    .setProtectedHeader({ alg })
    .sign(secret);
  return jwt;
};
