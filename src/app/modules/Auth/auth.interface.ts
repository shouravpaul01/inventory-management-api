export interface ILoginPayload {
  email?: string;
  username?: string;
  password: string;
}

export interface IChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface IForgotPasswordPayload {
  email: string;
}

export interface IVerifyResetOtpPayload {
  email: string;
  otp: string;
}

export interface IResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

export interface IAuthUserTokenPayload {
  [key: string]: unknown;
  id: string;
  employeeId: string;
  username: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  isSuperAdmin: boolean;
  departmentId?: string | null;
  roles: string[];
  permissions: string[];
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}
