import { SignOptions } from "jsonwebtoken";
import { env } from "../../../config/env.config";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import ms, { StringValue } from "ms";
import { User } from "@prisma/client";


const cookiesDomain = env.NODE_ENV === "production"
  ? ".app--magic.com"
  : undefined
const setTokenCookies = (res: any, user: Partial<User>) => {
  const accessToken = jwtHelpers.generateToken(
    { ...user },
    env.JWT_SECRET,
    env.EXPIRES_IN as any,
  );

  const refreshToken = jwtHelpers.generateToken(
    { user },
    env.REFRESH_TOKEN_SECRET!,
    env.REFRESH_TOKEN_EXPIRES_IN as any,
  );

  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    domain: cookiesDomain,
    path: "/",
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: ms(env.EXPIRES_IN as StringValue),
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: ms(env.REFRESH_TOKEN_EXPIRES_IN as StringValue),
  });

  return {
    accessToken,
    refreshToken,
  };
};
export const AuthUtils = { setTokenCookies };
