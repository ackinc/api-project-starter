// routes to sign in and out, plus allied routes
//   like email verification, reset password etc.

import express from "express";

import {
  loginWithPassword,
  loginWithToken,
  logout,
  sendVerificationEmail,
  signup,
} from "./auth.handlers";
import { checkAuthenticated } from "../common/common.handlers";

const authRouter = express.Router();

authRouter.post("/signup", signup, sendVerificationEmail);

authRouter.post("/send_verification_email", sendVerificationEmail);

authRouter.post("/login/:b64data", loginWithToken);

// verification email is only sent if user's email is unverified
authRouter.post("/login", loginWithPassword, sendVerificationEmail);

authRouter.post("/logout", checkAuthenticated, logout);

export default authRouter;
