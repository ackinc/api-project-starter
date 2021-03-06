import bcrypt from "bcrypt";
import type { RequestHandler } from "express";
import { getRepository } from "typeorm";

import { getClient } from "../common/cache";
import {
  fromBase64,
  sendVerificationEmail,
  sendVerificationSMS,
} from "../common/helpers";
import { constants, frontendLocation, passwordSaltRounds } from "../config";
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
    res.status(400).json({ error: constants.EMAIL_TAKEN });
    return;
  }

  if (phone && phoneCountryCode) {
    user = await userRepository.findOne({ phone, phoneCountryCode });
    if (user) {
      res.status(400).json({ error: constants.PHONE_TAKEN });
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

  // Calling `sendVerificationEmail` *after* `res.json(...)` causes an
  //   uncaughtPromiseRejection when running tests due to a module being loaded
  //   *after* all tests are run. See write-up "ry83hu"
  await sendVerificationEmail(user, frontendLocation);
  res.json({ message: constants.VERIFICATION_EMAIL_SENT });
};

export const sendVerificationEmail_Handler: RequestHandler = async (
  req,
  res
) => {
  // redirectUrl is used to tell the loginWithToken route handler
  //   where to redirect the user after token verification
  // This is useful when implementing magic sign-in
  const {
    email,
    redirectUrl,
  }: { email: string; redirectUrl?: string } = req.body;

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({ email });
  if (user) await sendVerificationEmail(user, redirectUrl);

  res.json({ message: constants.VERIFICATION_EMAIL_SENT });
};

export const sendVerificationSMS_Handler: RequestHandler = async (req, res) => {
  const { phoneCountryCode, phone } = req.body;

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({ phone, phoneCountryCode });
  if (user) await sendVerificationSMS(user);

  res.json({ message: constants.VERIFICATION_SMS_SENT });
};

export const loginWithPassword: RequestHandler = async (req, res) => {
  const { email, phoneCountryCode, phone, password } = req.body;

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({
    ...(email ? { email } : { phone, phoneCountryCode }),
  });
  if (!user) {
    res.status(400).json({ error: constants.INVALID_CREDENTIALS });
    return;
  }

  if (!(await bcrypt.compare(password, user.password as string))) {
    res.status(400).json({ error: constants.INVALID_CREDENTIALS });
    return;
  }

  if (email && !user.emailVerified) {
    await sendVerificationEmail(user, frontendLocation);
    res.json({ message: constants.VERIFICATION_EMAIL_SENT });
    return;
  }

  if (phoneCountryCode && phone && !user.phoneVerified) {
    await sendVerificationSMS(user);
    res.json({ message: constants.VERIFICATION_SMS_SENT });
    return;
  }

  req.session.user = user;
  res.json({ message: constants.LOGIN_SUCCESS });
};

export const loginWithToken: RequestHandler = async (req, res) => {
  const { b64data } = req.params;
  const data = fromBase64(b64data).split("::");

  let email, phone, phoneCountryCode, suppliedToken;
  if (data.length === 2) [email, suppliedToken] = data;
  else if (data.length === 3) [phoneCountryCode, phone, suppliedToken] = data;
  else {
    res.status(400).json({ error: constants.TOKEN_INVALID_OR_EXPIRED });
    return;
  }

  const cache = getClient();
  const cacheKeySuffix = email || `${phoneCountryCode}${phone}`;
  const cacheKey = `tokens:${cacheKeySuffix}`;
  const actualToken = await cache.get(cacheKey);
  if (!actualToken || suppliedToken !== actualToken) {
    res.status(400).json({ error: constants.TOKEN_INVALID_OR_EXPIRED });
    return;
  }

  await cache.del(cacheKey);

  const userRepository = getRepository(User);
  let user = await userRepository.findOne(
    email ? { email } : { phoneCountryCode, phone }
  );
  if (!user) {
    res.status(500).json({ error: constants.SERVER_ERROR });
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
    res.json({ message: constants.LOGIN_SUCCESS });
  }
};

export const logout: RequestHandler = (req, res) => {
  delete req.session.user;
  res.json({ message: constants.LOGOUT_SUCCESS });
};
