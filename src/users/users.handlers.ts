import _ from "lodash";
import type { RequestHandler } from "express";
import { getRepository } from "typeorm";

import { sendVerificationEmail, sendVerificationSMS } from "../common/helpers";
import User from "../entities/User.entity";
import { constants, frontendLocation } from "../config";

export const getUser: RequestHandler = async (req, res) => {
  const retrievableUserProperties = [
    "id",
    "firstName",
    "lastName",
    "email",
    "phoneCountryCode",
    "phone",
    "profilePicUrl",
  ];

  let user: User;
  try {
    user = await getRepository(User).findOneOrFail(
      req.session?.user?.id as number
    );
  } catch (e) {
    return res.status(404).json({ error: constants.NOT_FOUND });
  }

  res.json({ data: _.pick(user, retrievableUserProperties) });
};

export const updateUser: RequestHandler = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phoneCountryCode,
    phone,
    profilePicUrl,
  } = req.body;

  const userId: number =
    req.params.id === "me"
      ? (req.session?.user?.id as number)
      : Number(req.params.id);

  const userRepository = getRepository(User);
  let user = await userRepository.findOne(userId);
  if (!user) {
    return res.status(404).json({ error: constants.NOT_FOUND });
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (profilePicUrl) user.profilePicUrl = profilePicUrl;
  if (email && email !== user.email) {
    // extra guard to make sure we're not triggering a verification
    //   email if FE sends email in update request even though the user
    //   didn't actually change their email
    user.email = email;
    user.emailVerified = false;
    sendVerificationEmail(user, frontendLocation);
  }
  if (
    (phone && phone !== user.phone) ||
    (phoneCountryCode && phoneCountryCode !== user.phoneCountryCode)
  ) {
    if (phone) user.phone = phone;
    if (phoneCountryCode) user.phoneCountryCode = phoneCountryCode;
    user.phoneVerified = false;
    sendVerificationSMS(user);
  }
  user = await userRepository.save(user);

  res.json({ data: user });
};
