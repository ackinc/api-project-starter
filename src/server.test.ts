import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.test") });

import request from "supertest";
import { Connection, createConnection as createDbConnection } from "typeorm";

import createApp from "./app";
import { cookieSecrets, databaseUrl } from "./config";
import User from "./entities/User.entity";

const app = createApp({ saveUninitialized: true, secret: cookieSecrets });
let dbConnection: Connection;

beforeAll(async () => {
  dbConnection = await createDbConnection({
    type: "postgres",
    url: databaseUrl,
    entities: [User],
    synchronize: true,
  });
});

afterAll(() => dbConnection.close());

describe("signup", () => {
  test("creates user in DB and triggers verification email", (done) => {
    request(app)
      .post("/auth/signup")
      .send({
        firstName: "Test",
        lastName: "User",
        email: "testuser@mailinator.com",
        password: "123456",
      })
      .expect(200, done);
  });
});
