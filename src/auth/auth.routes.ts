// routes to sign in and out, plus allied routes
//   like email verification, reset password etc.

import express from "express";
import { body, param } from "express-validator";

import { checkAuthenticated, validateRequest } from "../common/handlers";
import {
  emailOrPhoneSanitizer,
  emailOrPhoneValidator,
  phoneSanitizer,
  phoneValidator,
} from "../common/helpers";
import { minPasswordLength } from "../config";

import {
  loginWithPassword,
  loginWithToken,
  logout,
  sendVerificationEmail_Handler,
  sendVerificationSMS_Handler,
  signup,
} from "./auth.handlers";

const authRouter = express.Router();

authRouter.post(
  "/signup",
  body("firstName").exists(),
  body("lastName").exists(),
  body("email").isEmail(),
  body("password")
    .isLength({ min: minPasswordLength })
    .withMessage(`must be at least ${minPasswordLength} characters`),
  body("phone")
    .optional()
    .customSanitizer(phoneSanitizer)
    .custom(phoneValidator),
  validateRequest,
  signup
);

authRouter.post(
  "/send_email_verification_link",
  body("email").isEmail(),
  body("redirectUrl").optional().isURL(),
  validateRequest,
  sendVerificationEmail_Handler
);

authRouter.post(
  "/send_phone_verification_code",
  body("phoneCountryCode").exists(),
  body("phone").customSanitizer(phoneSanitizer).custom(phoneValidator),
  validateRequest,
  sendVerificationSMS_Handler
);

// TODO: allow user to reset password via phone
authRouter.post(
  "/send_password_reset_link",
  body("email").isEmail(),
  body("redirectUrl").isURL(),
  validateRequest,
  sendVerificationEmail_Handler
);

// emailOrPhoneSanitizer populates req.body.email or req.body.phone
authRouter.post(
  "/login",
  body("emailOrPhone")
    .custom(emailOrPhoneValidator)
    .customSanitizer(emailOrPhoneSanitizer),
  body("email").optional().isEmail(),
  body("phone")
    .optional()
    .customSanitizer(phoneSanitizer)
    .custom(phoneValidator),
  body("password").exists(),
  validateRequest,
  loginWithPassword
);

authRouter.get("/login/:b64data", param("b64data").isBase64(), loginWithToken);
authRouter.post("/login/:b64data", param("b64data").isBase64(), loginWithToken);

authRouter.post("/logout", checkAuthenticated, logout);

export default authRouter;
