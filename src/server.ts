import dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";

import connectRedis from "connect-redis";
import session from "express-session";
import { Connection, createConnection as createDbConnection } from "typeorm";
import { promisify } from "util";

import createApp from "./app";
import { getClient as getRedisClient } from "./common/cache";
import {
  allowedOrigins,
  cookieSecrets,
  databaseUrl,
  nodeEnv,
  port,
} from "./config";
import User from "./entities/User.entity";

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

const RedisStore = connectRedis(session);
const app = createApp(
  {
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
  },
  { origin: allowedOrigins, credentials: true }
);

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
