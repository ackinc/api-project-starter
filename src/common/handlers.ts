import type { RequestHandler } from "express";
import { validationResult } from "express-validator";

export const checkAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.user) {
    res.status(401).json({ error: "NOT_AUTHENTICATED" });
  } else {
    next();
  }
};

export const validateRequest: RequestHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0] });
  } else {
    next();
  }
};
