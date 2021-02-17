import bcrypt from "bcrypt";
import type { RequestHandler } from "express";
import { getRepository } from "typeorm";

import * as cache from "../common/cache";
import emailer from "../common/emailer";
import { getRandomString, fromBase64, toBase64 } from "../common/helpers";
import {
  apiLocation,
  emailVerificationTokenExpiryMinutes,
  emailVerificationTokenLength,
  frontendLocation,
  passwordSaltRounds,
} from "../config";
import User from "../entities/User.entity";

export const signup: RequestHandler = async (req, res, next) => {
  const {
    email,
    firstName,
    lastName,
    password,
    phone,
    phoneCountryCode,
  } = req.body;
  const hashedPassword = await bcrypt.hash(password, passwordSaltRounds);

  const userRepository = getRepository(User);
  let user = await userRepository.findOne({ email });
  if (user) {
    res.status(400).json({ error: "EMAIL_TAKEN" });
    return;
  }

  if (phone && phoneCountryCode) {
    user = await userRepository.findOne({ phone, phoneCountryCode });
    if (user) {
      res.status(400).json({ error: "PHONE_TAKEN" });
      return;
    }
  }

  user = new User();
  user.firstName = firstName;
  user.lastName = lastName;
  user.email = email;
  user.emailVerified = false;
  user.password = hashedPassword;
  if (phone && phoneCountryCode) {
    user.phone = phone;
    user.phoneCountryCode = phoneCountryCode;
    user.phoneVerified = false;
  }

  try {
    user = await userRepository.save(user);
  } catch (e) {
    next(e);
    return;
  }

  res.json({ message: "VERIFICATION_LINK_SENT" });

  sendVerificationEmail(user.email as string, frontendLocation);
  if (phone && phoneCountryCode) {
    // TODO: send verification SMS
  }
};

export const sendVerificationEmail_Handler: RequestHandler = async (
  req,
  res
) => {
  res.json({ message: "EMAIL_MAYBE_SENT" });

  // redirectUrl is used to tell the loginWithToken route handler
  //   where to redirect the user after token verification
  // This is useful when implementing magic sign-in
  const { email, redirectUrl } = req.body;

  const userRepository = getRepository(User);
  const user = userRepository.findOne({ email });
  if (!user) return;

  sendVerificationEmail(email, redirectUrl);
};

// TODO: support login with phone and password
export const loginWithPassword: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, passwordSaltRounds);

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({ email, password: hashed });
  if (!user) {
    res.status(400).json({ error: "INVALID_CREDENTIALS" });
    return;
  }

  if (!user.emailVerified) {
    res.json({ message: "VERIFICATION_LINK_SENT" });
    sendVerificationEmail(user.email as string, frontendLocation);
    return;
  }

  req.session.user = user;
  res.json({ message: "LOGIN_SUCCESSFUL" });
};

// TODO: support login with token from phone
export const loginWithToken: RequestHandler = async (req, res) => {
  const { b64data } = req.params;
  const [email, suppliedToken] = fromBase64(b64data).split("::");

  const actualToken = await cache.get(`tokens:${email}`);
  if (!actualToken || suppliedToken !== actualToken) {
    res.status(400).json({ error: "TOKEN_INVALID_OR_EXPIRED" });
    return;
  }

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({ email });
  if (!user) {
    res.status(400).json({ message: "TOKEN_INVALID_OR_EXPIRED" });
    return;
  }
  if (!user.emailVerified) {
    user.emailVerified = true;
    await userRepository.save(user);
  }

  req.session.user = user;

  const { redirectUrl } = req.query;
  if (redirectUrl) {
    res.status(302).redirect(fromBase64(redirectUrl as string));
  } else {
    res.json({ message: "LOGIN_SUCCESSFUL" });
  }
};

export const logout: RequestHandler = (req, res) => {
  delete req.session.user;
  res.json({ message: "LOGOUT_SUCCESSFUL" });
};

// The `redirectUrl` param is used to tell the loginWithToken
//   route handler (which gets hit when user clicks verification link)
//   where to redirect the user after token verification
async function sendVerificationEmail(email: string, redirectUrl?: string) {
  const token = createEmailVerificationToken();
  const expirySeconds = emailVerificationTokenExpiryMinutes * 60;

  // TODO: Typescript should be able to see that the following
  //   function call is valid, but it doesn't. Find out why.
  await cache.set(`tokens:${email}`, token, "EX", expirySeconds);

  const b64data = toBase64(`${email}::${token}`);
  let verificationLink = `${apiLocation}/login/${b64data}`;
  if (redirectUrl) verificationLink += `?redirect=${toBase64(redirectUrl)}`;

  return emailer.send({
    template: "email-verification",
    message: { to: email },
    locals: { link: verificationLink },
  });
}

function createEmailVerificationToken() {
  return getRandomString(emailVerificationTokenLength, { disallowed: ":" });
}
