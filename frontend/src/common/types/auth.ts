export type UserType = "admin" | "customer";

export type User = {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  role?: string;
};

export type LoginRequest = {
  usernameOrEmail: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type GoogleAuthRequest = {
  idToken: string;
};

export type GoogleAuthStatus = "SUCCESS" | "LINK_REQUIRED" | "PROFILE_REQUIRED";

export type GoogleAuthResult = {
  status: GoogleAuthStatus;
  message: string;
  auth: LoginResponse | null;
  email?: string;
  fullName?: string;
  username?: string;
  requiresProfileCompletion?: boolean;
};

export type LinkGoogleRequest = {
  idToken: string;
  password: string;
};

export type RegisterRequest = {
  fullName: string;
  username: string;
  password: string;
  email: string;
  phone?: string;
  address?: string;
};

export type RegisterResponse = {
  token: string;
  user: User;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ForgotPasswordIdentifyRequest = {
  usernameOrEmail: string;
};

export type ForgotPasswordVerifyCodeRequest = {
  usernameOrEmail: string;
  code: string;
};

export type ForgotPasswordResetRequest = {
  usernameOrEmail: string;
  code: string;
  newPassword: string;
};

export type ForgotPasswordIdentifyResponse = {
  message: string;
};

export type ForgotPasswordVerifyCodeResponse = {
  message: string;
};

export type ForgotPasswordResetResponse = {
  message: string;
};

export type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  forgotPasswordSuccess: boolean;
  registerSuccess: boolean;
};
