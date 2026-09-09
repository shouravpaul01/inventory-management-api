import { env } from "../../../config/env.config";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import ms, { StringValue } from "ms";

const setTokenCookies = (res: any, payload: Record<string, unknown>) => {
  const accessToken = jwtHelpers.generateToken(
    payload,
    env.JWT_SECRET,
    env.EXPIRES_IN as any
  );

  const refreshToken = jwtHelpers.generateToken(
    { id: payload.id },
    env.REFRESH_TOKEN_SECRET!,
    env.REFRESH_TOKEN_EXPIRES_IN as any
  );

  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  if (res && typeof res.cookie === "function") {
    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: ms(env.EXPIRES_IN as StringValue),
    });

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: ms(env.REFRESH_TOKEN_EXPIRES_IN as StringValue),
    });
  }

  return {
    accessToken,
    refreshToken,
  };
};

export const AuthUtils = { setTokenCookies };
