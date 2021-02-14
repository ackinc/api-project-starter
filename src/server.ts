import dotenv from "dotenv";
dotenv.config();
const {
  ALLOWED_ORIGINS,
  COOKIE_SECRET,
  DATABASE_URL,
  NODE_ENV = "development",
  PORT = 3000,
} = process.env;
if (!ALLOWED_ORIGINS) console.warn("Warning: No ALLOWED_ORIGINS in env");
if (!COOKIE_SECRET) throw new Error("No COOKIE_SECRET in env");
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL in env");

import "reflect-metadata";

import cors from "cors";
import express from "express";
import session from "express-session";
import connectRedis from "connect-redis";
import { createConnection as createDbConnection } from "typeorm";

import authRouter from "./auth/auth.routes";
import { getClient as getRedisClient } from "./common/cache";
import User from "./entities/User.entity";

const RedisStore = connectRedis(session);

createDbConnection({
  type: "postgres",
  url: DATABASE_URL,
  entities: [User],
  synchronize: NODE_ENV === "development",
});

const app = express();
if (NODE_ENV !== "development") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: ALLOWED_ORIGINS?.split(","),
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    name: "ae-sid",
    cookie: {
      httpOnly: true,
      maxAge: 7 * 86400 * 1000, // persists a week
      secure: NODE_ENV !== "development",
      sameSite: NODE_ENV !== "development" ? "none" : "strict",
    },
    resave: false,
    saveUninitialized: true,
    secret: COOKIE_SECRET.split(","),
    store: new RedisStore({ client: getRedisClient() }),
    rolling: true,
  })
);

app.get("/", (req, res) => res.end("OK"));
app.use("/auth", authRouter);

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
