import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.test") });

import request from "supertest";
import { Connection, createConnection as createDbConnection } from "typeorm";

// This import creates a Redis connection as a side-effect
// TODO: Explore how dependency injection can make this better
import createApp from "./app";
import redisClient from "./common/cache";
import { cookieSecrets, databaseUrl } from "./config";
import User from "./entities/User.entity";

const app = createApp({
  resave: false,
  saveUninitialized: true,
  secret: cookieSecrets,
});
let dbConnection: Connection;

beforeAll(async () => {
  dbConnection = await createDbConnection({
    type: "postgres",
    url: databaseUrl,
    entities: [User],
    dropSchema: true,
    synchronize: true,
  });
});

afterAll(async () => {
  await redisClient.disconnect();
  await dbConnection.close();
});

describe("signup", () => {
  it("creates user in DB and triggers verification email", () => {
    // return request(app)
    //   .post("/auth/signup")
    //   .send({
    //     firstName: "Test",
    //     lastName: "User",
    //     email: "testuser@mailinator.com",
    //     password: "123456",
    //   })
    //   .expect(200)
    //   .then(() => {});
  });
});
