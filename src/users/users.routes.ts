// routes to get and update user details

import express from "express";
import { body } from "express-validator";

import { validateRequest } from "../common/handlers";
import { minPasswordLength } from "../config";

import { getUser, updateUser } from "./users.handlers";
import { checkTargetUserIsAuthenticatedUser } from "../common/handlers";

const usersRouter = express.Router();

usersRouter.get(
  "/:id",
  checkTargetUserIsAuthenticatedUser("params.id"),
  getUser
);

// TODO: validate phoneCountryCode
usersRouter.post(
  "/:id",
  checkTargetUserIsAuthenticatedUser("params.id"),
  body("email").optional().isEmail(),
  body("password")
    .optional()
    .isLength({ min: minPasswordLength })
    .withMessage(`must be at least ${minPasswordLength} characters`),
  body("phone")
    .optional()
    .customSanitizer((phone) => phone.replace(/\D/g, ""))
    .isMobilePhone("any"),
  body("profilePicUrl").optional().isURL(),
  validateRequest,
  updateUser
);

export default usersRouter;
