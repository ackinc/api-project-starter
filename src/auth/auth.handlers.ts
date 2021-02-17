import bcrypt from "bcrypt";
import type { RequestHandler } from "express";
import { getRepository } from "typeorm";

import * as cache from "../common/cache";
import emailer from "../common/emailer";
import { getRandomString } from "../common/helpers";
import User from "../entities/User.entity";

const passwordSaltRounds = 12;
const tokenLength = 30;

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
  user = await userRepository.save(user);
  next();
};

export const loginWithPassword: RequestHandler = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "EMAIL_OR_PASSWORD_MISSING" });
    return;
  }

  const hashed = await bcrypt.hash(password, passwordSaltRounds);

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({ email, password: hashed });
  if (!user) {
    res.status(400).json({ error: "INVALID_CREDENTIALS" });
    return;
  }

  if (!user.emailVerified) {
    next();
    return;
  }

  req.session.user = user;
  res.json({ message: "LOGIN_SUCCESSFUL" });
};

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

export const sendVerificationEmail: RequestHandler = async (req, res, next) => {
  // redirectUrl is used to tell the loginWithToken route handler
  //   where to redirect the user after token verification
  // This is useful when implementing magic sign-in
  const { email, redirectUrl } = req.body;

  const userRepository = getRepository(User);
  const user = userRepository.findOne({ email });
  if (!user) {
    res.json({ message: "EMAIL_MAYBE_SENT" });
    return;
  }

  const token = createEmailVerificationToken();

  try {
    await cache.set(`tokens:${email}`, token);
  } catch (e) {
    next(e);
    return;
  }

  const b64data = toBase64(`${email}::${token}`);
  let verificationLink = `${req.protocol}://${req.hostname}/login/${b64data}`;
  if (redirectUrl) verificationLink += `?redirect=${toBase64(redirectUrl)}`;

  try {
    await emailer.send({
      template: "email-verification",
      message: { to: email },
      locals: { link: verificationLink },
    });
    res.json({ message: "EMAIL_MAYBE_SENT" });
  } catch (e) {
    next(e);
  }
};

function createEmailVerificationToken() {
  return getRandomString(tokenLength, { disallowed: ":" });
}

function toBase64(str: string) {
  return Buffer.from(str).toString("base64");
}

function fromBase64(b64str: string) {
  return Buffer.from(b64str, "base64").toString();
}
