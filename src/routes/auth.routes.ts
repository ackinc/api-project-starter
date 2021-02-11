// routes to sign in and out, plus allied routes
//   like email verification, reset password etc.

import express from "express";

const authRouter = express.Router();

authRouter.get("/", (req, res) => res.end("authRouter: OK"));

export default authRouter;
