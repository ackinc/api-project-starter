import _ from "lodash";
import type { RequestHandler } from "express";
import { validationResult } from "express-validator";

import { constants } from "../config";

export const checkAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.user) {
    res.status(401).json({ error: constants.NOT_AUTHENTICATED });
  } else {
    next();
  }
};

// checks that the user whose data is being retrieved/updated is
//   the same as the user making the request
export const checkTargetUserIsAuthenticatedUser: (
  idPath: string
) => RequestHandler = (idPath) => (req, res, next) => {
  if (!req.session.user) {
    res.status(401).json({ error: constants.NOT_AUTHENTICATED });
    return;
  }

  const id = _.get(req, idPath);
  if (id !== "me" && Number(id) !== req.session.user.id) {
    res.status(403).json({ error: constants.NOT_AUTHORIZED });
    return;
  }

  next();
};

export const validateRequest: RequestHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = errors.array()[0];
    res.status(400).json({
      error: `${constants.INVALID_DATA}: ${error.param} - ${error.msg}`,
    });
  } else {
    next();
  }
};
