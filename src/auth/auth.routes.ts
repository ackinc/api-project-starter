// routes to sign in and out, plus allied routes
//   like email verification, reset password etc.

import express from "express";
import { body } from "express-validator";

import { validateRequest } from "../common/handlers";
import { minPasswordLength } from "../config";

import {
  loginWithPassword,
  loginWithToken,
  logout,
  sendVerificationEmail_Handler,
  sendVerificationSMS_Handler,
  signup,
} from "./auth.handlers";
import { checkAuthenticated } from "../common/handlers";

const authRouter = express.Router();

authRouter.post(
  "/signup",
  body("firstName").exists(),
  body("lastName").exists(),
  body("email").isEmail(),
  body("password")
    .isLength({ min: minPasswordLength })
    .withMessage(`must be at least ${minPasswordLength} characters`),
  validateRequest,
  signup
);

authRouter.post(
  "/send_email_verification_link",
  body("email").isEmail().normalizeEmail({ all_lowercase: true }),
  body("redirectUrl").optional().isURL(),
  validateRequest,
  sendVerificationEmail_Handler
);

authRouter.post(
  "/send_phone_verification_code",
  body("phoneCountryCode").exists(),
  body("phone").exists(),
  validateRequest,
  sendVerificationSMS_Handler
);

authRouter.post(
  "/send_password_reset_link",
  body("email").isEmail().normalizeEmail({ all_lowercase: true }),
  body("redirectUrl").isURL(),
  validateRequest,
  sendVerificationEmail_Handler
);

authRouter.post(
  "/login",
  body("emailOrPhone").exists(),
  body("password").exists(),
  validateRequest,
  loginWithPassword
);

authRouter.get("/login/:b64data", loginWithToken);
authRouter.post("/login/:b64data", loginWithToken);

authRouter.post("/logout", checkAuthenticated, logout);

export default authRouter;
