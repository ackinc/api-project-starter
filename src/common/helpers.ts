import * as cache from "./cache";
import sendEmail from "./email";
import sendSMS from "./sms";
import {
  emailVerificationTokenExpiryMinutes,
  emailVerificationTokenLength,
  phoneVerificationCodeExpiryMinutes,
  phoneVerificationCodeLength,
  apiLocation,
} from "../config";
import User from "../entities/User.entity";

const lowercase = "abcdefghijklmnopqrstuvwxyz";
const uppercase = lowercase.toUpperCase();
const digits = "0123456789";
const symbols = `~\`!@#$%^&*()_-+={[}]|\\:;"'<,>.?/`;

interface CharacterOptions {
  all?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
  allowed?: string;
  disallowed?: string;
}

export function getRandomString(
  len: number,
  options: CharacterOptions = { lowercase: true }
): string {
  let allowed = "";

  if (options.allowed) {
    allowed = options.allowed;
  } else if (options.all) {
    allowed += lowercase + uppercase + digits + symbols;
  } else {
    if (options.lowercase) allowed += lowercase;
    if (options.uppercase) allowed += uppercase;
    if (options.digits) allowed += digits;
    if (options.symbols) allowed += symbols;
  }

  if (options.disallowed) {
    options.disallowed
      .split("")
      .forEach((c) => (allowed = allowed.replace(c, "")));
  }

  const retval = [];
  for (let i = 0; i < len; i++) {
    retval[i] = allowed[Math.floor(Math.random() * allowed.length)];
  }

  return retval.join("");
}

export function toBase64(str: string): string {
  return Buffer.from(str).toString("base64");
}

export function fromBase64(b64str: string): string {
  return Buffer.from(b64str, "base64").toString();
}

// The `redirectUrl` param determines where the user is redirected
//   after token verification
export async function sendVerificationEmail(
  user: User,
  redirectUrl?: string
): Promise<unknown> {
  const { email } = user;
  if (!email) throw new Error(`email missing for user ${user.id}`);

  const token = createEmailVerificationToken();
  const expirySeconds = emailVerificationTokenExpiryMinutes * 60;

  // @ts-expect-error: Typescript should be able to see that the following
  //   function call is valid, but it doesn't
  await cache.set(`tokens:${email}`, token, "EX", expirySeconds);

  const b64data = toBase64(`${email}::${token}`);
  let verificationLink = `${apiLocation}/auth/login/${b64data}`;
  if (redirectUrl) verificationLink += `?redirectUrl=${toBase64(redirectUrl)}`;

  return sendEmail({
    to: email,
    template: "email-verification",
    locals: { link: verificationLink },
  });
}

function createEmailVerificationToken() {
  return getRandomString(emailVerificationTokenLength, { lowercase: true });
}

export async function sendVerificationSMS(user: User): Promise<void> {
  const { phone, phoneCountryCode } = user;
  if (!phone || !phoneCountryCode) {
    throw new Error(`phone or phoneCountryCode missing for user ${user.id}`);
  }
  const fullPhoneNumber = `${phoneCountryCode}${phone}`;

  const code = createSMSVerificationCode();
  const expirySeconds = phoneVerificationCodeExpiryMinutes * 60;

  // @ts-expect-error: Typescript should be able to see that the following
  //   function call is valid, but it doesn't
  await cache.set(`tokens:${fullPhoneNumber}`, code, "EX", expirySeconds);

  return sendSMS({
    to: fullPhoneNumber,
    template: "phone-verification",
    locals: { code },
  });
}

function createSMSVerificationCode() {
  return getRandomString(phoneVerificationCodeLength, { digits: true });
}
