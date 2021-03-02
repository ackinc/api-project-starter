/**
 * @jest-environment node
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.test") });

import request from "supertest";
import {
  Connection,
  createConnection as createDbConnection,
  getRepository,
} from "typeorm";

import createApp from "./app";
import { createClient } from "./common/cache";
import { cookieSecrets, databaseUrl, redisUrl } from "./config";
import User from "./entities/User.entity";

const app = createApp({
  resave: false,
  saveUninitialized: true,
  secret: cookieSecrets,
});
let dbConnection: Connection;
const redisClient = createClient(redisUrl);

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
  it("creates user in DB", async () => {
    const dummyUser = {
      firstName: "Test",
      lastName: "User",
      email: "testuser+ru3329@mailinator.com",
      password: "123456",
      phoneCountryCode: "+91",
      phone: "1111111111",
    };

    await request(app).post("/auth/signup").send(dummyUser).expect(200, {
      message: "VERIFICATION_EMAIL_SENT",
    });

    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ email: dummyUser.email });

    expect(user).toBeInstanceOf(User);
    expect(user?.firstName).toBe(dummyUser.firstName);
    expect(user?.lastName).toBe(dummyUser.lastName);
    expect(user?.email).toBe(dummyUser.email);
    expect(user?.emailVerified).toBe(false);
    expect(user?.password).toBeDefined();
    expect(user?.phoneCountryCode).toBe(dummyUser.phoneCountryCode);
    expect(user?.phone).toBe(dummyUser.phone);
    expect(user?.phoneVerified).toBe(false);
  });

  it("fails if firstName, lastName, email, or password are not provided", () => {
    const dummyUsers = [
      {
        lastName: "User",
        email: "testuser+ru3329@mailinator.com",
        password: "123456",
      },
      {
        firstName: "Test",
        email: "testuser+ru3329@mailinator.com",
        password: "123456",
      },
      {
        firstName: "Test",
        lastName: "User",
        password: "123456",
      },
      {
        firstName: "Test",
        lastName: "User",
        email: "testuser+ru3329@mailinator.com",
      },
    ];

    return Promise.all(
      dummyUsers.map((du) =>
        request(app).post("/auth/signup").send(du).expect(400)
      )
    );
  });

  it("fails if supplied email, password, or phone number are invalid", () => {
    const dummyUsers = [
      {
        firstName: "Test",
        lastName: "User",
        email: "testuser+ru3329",
        password: "123456",
      },
      {
        firstName: "Test",
        lastName: "User",
        email: "testuser+ru3329",
        password: "12345", // too short
      },
      {
        firstName: "Test",
        lastName: "User",
        email: "testuser+ru3329@mailinator.com",
        password: "123456",
        phone: "1111111111",
      },
      {
        firstName: "Test",
        lastName: "User",
        email: "testuser+ru3329@mailinator.com",
        password: "123456",
        phoneCountryCode: "+91",
      },
      {
        firstName: "Test",
        lastName: "User",
        email: "testuser+ru3329@mailinator.com",
        password: "123456",
        phoneCountryCode: "+91",
        phone: "abc",
      },
    ];

    return Promise.all(
      dummyUsers.map((du) =>
        request(app).post("/auth/signup").send(du).expect(400)
      )
    );
  });

  it("does not create user if email already in use", async () => {
    const dummyUser1 = {
      firstName: "Test",
      lastName: "User",
      email: "testuser+r3wr@mailinator.com",
      password: "123456",
    };

    const dummyUser2 = {
      firstName: "Anothertest",
      lastName: "User",
      email: "testuser+r3wr@mailinator.com",
      password: "123456",
    };

    await request(app).post("/auth/signup").send(dummyUser1).expect(200, {
      message: "VERIFICATION_EMAIL_SENT",
    });

    await request(app).post("/auth/signup").send(dummyUser2).expect(400, {
      error: "EMAIL_TAKEN",
    });
  });

  it("does not create user if phone already in use", async () => {
    const dummyUser1 = {
      firstName: "Test",
      lastName: "User",
      email: "testuser+gerr@mailinator.com",
      password: "123456",
      phoneCountryCode: "+91",
      phone: "9999999999",
    };

    const dummyUser2 = {
      firstName: "Anothertest",
      lastName: "User",
      email: "testuser+herr@mailinator.com",
      password: "123456",
      phoneCountryCode: "+91",
      phone: "9999999999",
    };

    await request(app).post("/auth/signup").send(dummyUser1).expect(200, {
      message: "VERIFICATION_EMAIL_SENT",
    });

    await request(app).post("/auth/signup").send(dummyUser2).expect(400, {
      error: "PHONE_TAKEN",
    });
  });
});
