import { toBase64, getRandomString } from "../common/helpers";
import * as cache from "../common/cache";
import sendEmail from "../common/email";
import sendSMS from "../common/sms";
import {
  emailVerificationTokenExpiryMinutes,
  emailVerificationTokenLength,
  phoneVerificationCodeExpiryMinutes,
  phoneVerificationCodeLength,
  apiLocation,
} from "../config";
import User from "../entities/User.entity";

// The `redirectUrl` param is used to tell the loginWithToken
//   route handler (which gets hit when user clicks verification link)
//   where to redirect the user after token verification
export async function sendVerificationEmail(
  user: User,
  redirectUrl?: string
): Promise<unknown> {
  const { email } = user;
  if (!email) throw new Error(`email missing for user ${user.id}`);

  const token = createEmailVerificationToken();
  const expirySeconds = emailVerificationTokenExpiryMinutes * 60;

  // TODO: Typescript should be able to see that the following
  //   function call is valid, but it doesn't. Find out why.
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

  // TODO: Typescript should be able to see that the following
  //   function call is valid, but it doesn't. Find out why.
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
