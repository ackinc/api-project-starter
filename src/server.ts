import dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";

import cors from "cors";
import express from "express";
import session from "express-session";
import connectRedis from "connect-redis";
import { Connection, createConnection as createDbConnection } from "typeorm";
import { promisify } from "util";

import authRouter from "./auth/auth.routes";
import usersRouter from "./users/users.routes";
import { getClient as getRedisClient } from "./common/cache";
import {
  allowedOrigins,
  cookieSecrets,
  databaseUrl,
  nodeEnv,
  port,
} from "./config";
import User from "./entities/User.entity";

const RedisStore = connectRedis(session);
const redisClient = getRedisClient();

let dbConnection: Connection;
(async () => {
  dbConnection = await createDbConnection({
    type: "postgres",
    url: databaseUrl,
    entities: [User],
    synchronize: nodeEnv === "development",
    logging: ["error"],
  });
})();

const app = express();
if (nodeEnv !== "development") {
  app.set("trust proxy", 1);
}

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use(
  session({
    name: "ae-sid",
    cookie: {
      httpOnly: true,
      maxAge: 7 * 86400 * 1000, // persists a week
      secure: nodeEnv !== "development",
      sameSite: nodeEnv !== "development" ? "none" : "strict",
    },
    resave: false,
    saveUninitialized: true,
    secret: cookieSecrets,
    store: new RedisStore({ client: redisClient }),
    rolling: true,
  })
);

app.get("/", (_, res) => res.end("OK"));
app.use("/auth", authRouter);
app.use("/users", usersRouter);

const server = app.listen(port, () =>
  console.log(`Server listening on port ${port}`)
);

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Shutting down...");

  // shut the server down first so that any in-process requests
  //   can continue to use the db and redis connections
  await promisify(server.close.bind(server))();
  await promisify(redisClient.quit.bind(redisClient))();
  await dbConnection.close();

  console.log(
    "Server has shut down and connections have been closed. The process will now exit."
  );
});
