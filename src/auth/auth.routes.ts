// routes to sign in and out, plus allied routes
//   like email verification, reset password etc.

import express from "express";
import { body } from "express-validator";

import { validateRequest } from "../common/handlers";

import {
  loginWithPassword,
  loginWithToken,
  logout,
  sendVerificationEmail,
  signup,
} from "./auth.handlers";
import { checkAuthenticated } from "../common/handlers";

const authRouter = express.Router();

authRouter.post(
  "/signup",
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  validateRequest,
  signup,
  sendVerificationEmail
);

authRouter.post(
  "/send_email_verification_link",
  body("redirectUrl").isURL(),
  validateRequest,
  sendVerificationEmail
);

authRouter.post(
  "/send_password_reset_link",
  body("redirectUrl").isURL(),
  validateRequest,
  sendVerificationEmail
);

authRouter.post("/login/:b64data", loginWithToken);

// verification email is only sent if user's email is unverified
authRouter.post(
  "/login",
  body("email").isEmail(),
  body("password"),
  validateRequest,
  loginWithPassword,
  sendVerificationEmail
);

authRouter.post("/logout", checkAuthenticated, logout);

export default authRouter;
