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
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
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
if (!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASSWORD) || !SMTP_URL) {
  throw new Error("Missing SMTP env vars");
}

export const allowedOrigins = ALLOWED_ORIGINS?.split(",");
export const apiLocation = API_LOCATION;
export const cookieSecrets = COOKIE_SECRETS.split(",");
export const databaseUrl = DATABASE_URL;
export const defaultMailFromAddress = DEFAULT_MAIL_FROM_ADDRESS;
export const frontendLocation = FRONTEND_LOCATION;
export const nodeEnv = NODE_ENV;
export const port = PORT;
export const redisUrl = REDIS_URL;
export const smtpHost = SMTP_HOST;
export const smtpPort = Number(SMTP_PORT);
export const smtpUser = SMTP_USER;
export const smtpPassword = SMTP_PASSWORD;
export const smtpUrl = SMTP_URL;

export const emailVerificationTokenLength = 30;
export const emailVerificationTokenExpiryMinutes = 15;
export const phoneVerificationCodeExpiryMinutes = 15;
export const minPasswordLength = 6;
export const passwordSaltRounds = 12;
