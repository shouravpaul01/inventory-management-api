export type TLogin = {
  userId: string;
  password: string;
};
export type TChangePassword = {
  email: string;
  password: string;
  oldPassword: string;
};
export type TMatchedOTP = {
  token: string;
  otp: string;
  
};
export type TResetPassword = {
  token: string;
  password: string;
  
};
