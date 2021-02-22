import bcrypt from "bcrypt";
import type { RequestHandler } from "express";
import { getRepository } from "typeorm";
import validator from "validator";

import { sendVerificationEmail, sendVerificationSMS } from "./auth.helpers";
import * as cache from "../common/cache";
import { fromBase64 } from "../common/helpers";
import { frontendLocation, passwordSaltRounds } from "../config";
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
  user.phoneVerified = false;
  if (phone && phoneCountryCode) {
    user.phone = phone;
    user.phoneCountryCode = phoneCountryCode;
  }

  try {
    user = await userRepository.save(user);
  } catch (e) {
    next(e);
    return;
  }

  res.json({ message: "VERIFICATION_LINK_SENT" });

  sendVerificationEmail(user, frontendLocation);
};

export const sendVerificationEmail_Handler: RequestHandler = async (
  req,
  res
) => {
  res.json({ message: "EMAIL_MAYBE_SENT" });

  // redirectUrl is used to tell the loginWithToken route handler
  //   where to redirect the user after token verification
  // This is useful when implementing magic sign-in
  const {
    email,
    redirectUrl,
  }: { email: string; redirectUrl?: string } = req.body;

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({ email });
  if (!user) return;

  sendVerificationEmail(user, redirectUrl);
};

export const sendVerificationSMS_Handler: RequestHandler = async (req, res) => {
  res.json({ message: "SMS_MAYBE_SENT" });

  const { phoneCountryCode, phone } = req.body;

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({ phone, phoneCountryCode });
  if (!user) return;

  sendVerificationSMS(user);
};

export const loginWithPassword: RequestHandler = async (req, res) => {
  const { emailOrPhone, phoneCountryCode, password } = req.body;
  let email: string | undefined, phone: string | undefined;

  if (validator.isEmail(emailOrPhone)) email = emailOrPhone as string;
  else phone = emailOrPhone as string;

  const hashed = await bcrypt.hash(password, passwordSaltRounds);

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({
    ...(email ? { email } : { phone, phoneCountryCode }),
  });
  if (!user) {
    res.status(400).json({ error: "INVALID_CREDENTIALS" });
    return;
  }

  if (!bcrypt.compare(hashed, user.password as string)) {
    res.status(400).json({ error: "INVALID_CREDENTIALS" });
    return;
  }

  if (email && !user.emailVerified) {
    res.json({ message: "VERIFICATION_EMAIL_SENT" });
    sendVerificationEmail(user, frontendLocation);
    return;
  }

  if (phoneCountryCode && phone && !user.phoneVerified) {
    res.json({ message: "VERIFICATION_SMS_SENT" });
    sendVerificationSMS(user);
    return;
  }

  req.session.user = user;
  res.json({ message: "LOGIN_SUCCESSFUL" });
};

export const loginWithToken: RequestHandler = async (req, res) => {
  const { b64data } = req.params;
  const data = fromBase64(b64data).split("::");

  let email, phone, phoneCountryCode, suppliedToken;
  if (data.length === 2) [email, suppliedToken] = data;
  else if (data.length === 3) [phoneCountryCode, phone, suppliedToken] = data;
  else {
    res.status(400).json({ error: "TOKEN_INVALID_OR_EXPIRED" });
    return;
  }

  const cacheKeySuffix = email || `${phoneCountryCode}${phone}`;
  const cacheKey = `tokens:${cacheKeySuffix}`;
  const actualToken = await cache.get(cacheKey);
  if (!actualToken || suppliedToken !== actualToken) {
    res.status(400).json({ error: "TOKEN_INVALID_OR_EXPIRED" });
    return;
  }

  // TODO: Typescript should be able to see that the following
  //   function call is valid, but it doesn't. Find out why.
  await cache.del(cacheKey);

  const userRepository = getRepository(User);
  let user = await userRepository.findOne(
    email ? { email } : { phoneCountryCode, phone }
  );
  if (!user) {
    res.status(400).json({ message: "TOKEN_INVALID_OR_EXPIRED" });
    return;
  }

  if (email && !user.emailVerified) {
    user.emailVerified = true;
    user = await userRepository.save(user);
  } else if (phone && phoneCountryCode && !user.phoneVerified) {
    user.phoneVerified = true;
    user = await userRepository.save(user);
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
