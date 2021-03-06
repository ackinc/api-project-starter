import cors from "cors";
import express, { Express } from "express";
import session, { SessionOptions } from "express-session";

import authRouter from "./auth/auth.routes";
import usersRouter from "./users/users.routes";

export default function createApp(
  sessOpts?: SessionOptions,
  corsOpts?: cors.CorsOptions
): Express {
  const app = express();
  if (app.get("env") !== "development") {
    app.set("trust proxy", 1);
  }

  app.use(cors(corsOpts));
  app.use(express.json());
  app.use(session(sessOpts));

  app.get("/", (_, res) => res.end("OK"));
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);

  return app;
}
