import _ from "lodash";
import type { RequestHandler } from "express";
import { getRepository } from "typeorm";

import {
  sendVerificationEmail,
  sendVerificationSMS,
} from "../auth/auth.helpers";
import User from "../entities/User.entity";
import { frontendLocation } from "../config";

export const getUser: RequestHandler = (req, res) => {
  const retrievableUserProperties = [
    "firstName",
    "lastName",
    "email",
    "phoneCountryCode",
    "phone",
    "profilePicUrl",
  ];

  res.json({
    data: _.pick(req.session.user, retrievableUserProperties),
  });
};

export const updateUser: RequestHandler = async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phoneCountryCode,
    phone,
    profilePicUrl,
  } = req.body;

  const curUser = req.session.user as Record<string, unknown>;
  const curUserId = curUser.id as number;

  const userRepository = getRepository(User);
  let user = await userRepository.findOne(curUserId);
  if (!user) {
    next(new Error(`Failed to find authenticated user ${curUserId} in DB`));
    return;
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (profilePicUrl) user.profilePicUrl = profilePicUrl;
  if (email) {
    user.email = email;
    user.emailVerified = false;
    sendVerificationEmail(user, frontendLocation);
  }
  if (phone || phoneCountryCode) {
    if (phone) user.phone = phone;
    if (phoneCountryCode) user.phoneCountryCode = phone;
    user.phoneVerified = false;
    sendVerificationSMS(user);
  }
  user = await userRepository.save(user);

  res.json({ message: "UPDATE_SUCCESSFUL", data: user });
};
