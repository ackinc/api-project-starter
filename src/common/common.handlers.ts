import type { RequestHandler } from "express";

export const checkAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.user) {
    res.status(401).json({ error: "NOT_AUTHENTICATED" });
  } else {
    next();
  }
};
