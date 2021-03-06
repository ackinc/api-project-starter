const {
  ALLOWED_ORIGINS,
  API_LOCATION,
  COOKIE_SECRETS,
  DATABASE_URL,
  DEFAULT_MAIL_FROM_ADDRESS,
  FRONTEND_LOCATION,
  NODE_ENV = "development",
  PORT = 3000,
  REDIS_URL,
  SMTP_URL,
} = process.env;
if (!ALLOWED_ORIGINS) console.warn("Warning: No ALLOWED_ORIGINS in env");
if (!API_LOCATION) throw new Error("No API_LOCATION in env");
if (!COOKIE_SECRETS) throw new Error("No COOKIE_SECRETS in env");
if (!DATABASE_URL) throw new Error("No DATABASE_URL in env");
if (!DEFAULT_MAIL_FROM_ADDRESS)
  throw new Error("No DEFAULT_EMAIL_FROM_ADDRESS in env");
if (!FRONTEND_LOCATION) throw new Error("No FRONTEND_LOCATION in env");
if (ALLOWED_ORIGINS && !ALLOWED_ORIGINS.split(",").includes(FRONTEND_LOCATION))
  console.warn("Warning: FRONTEND_LOCATION not in ALLOWED_ORIGINS");
if (!REDIS_URL) throw new Error("No REDIS_URL in env");
if (!SMTP_URL) throw new Error("No SMTP_URL in env");

export const allowedOrigins = ALLOWED_ORIGINS?.split(",");
export const apiLocation = API_LOCATION;
export const cookieSecrets = COOKIE_SECRETS.split(",");
export const databaseUrl = DATABASE_URL;
export const defaultMailFromAddress = DEFAULT_MAIL_FROM_ADDRESS;
export const frontendLocation = FRONTEND_LOCATION;
export const nodeEnv = NODE_ENV;
export const port = PORT;
export const redisUrl = REDIS_URL;
export const smtpUrl = SMTP_URL;

export const emailVerificationTokenLength = 30;
export const emailVerificationTokenExpiryMinutes = 15;
export const phoneVerificationCodeExpiryMinutes = 15;
export const phoneVerificationCodeLength = 6;
export const minPasswordLength = 6;
export const passwordSaltRounds = 12;

export const constants = {
  VERIFICATION_EMAIL_SENT: "VERIFICATION_EMAIL_SENT",
  VERIFICATION_SMS_SENT: "VERIFICATION_SMS_SENT",
  LOGIN_SUCCESS: "LOGIN_SUCCESSFUL",
  LOGOUT_SUCCESS: "LOGOUT_SUCCESSFUL",
  TOKEN_INVALID_OR_EXPIRED: "TOKEN_INVALID_OR_EXPIRED",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  PHONE_TAKEN: "PHONE_TAKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_DATA: "INVALID_DATA",
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  SERVER_ERROR: "SERVER_ERROR",
};
