/**
 * @jest-environment node
 */

jest.mock("./common/email");
jest.mock("./common/sms");

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
import sendEmail from "./common/email";
import sendSMS from "./common/sms";
import { cookieSecrets, databaseUrl, redisUrl } from "./config";
import User from "./entities/User.entity";

const app = createApp({
  resave: false,
  saveUninitialized: true,
  secret: cookieSecrets,
});
let dbConnection: Connection;
const redisClient = createClient(redisUrl);

const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockSendSMS = sendSMS as jest.MockedFunction<typeof sendSMS>;
mockSendEmail.mockImplementation(() => Promise.resolve(undefined));
mockSendSMS.mockImplementation(() => Promise.resolve(undefined));

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

afterEach(async () => {
  mockSendEmail.mockClear();
  mockSendSMS.mockClear();

  const userRepository = getRepository(User);
  await userRepository.clear();
});

describe("signup", () => {
  it("creates user in DB and triggers verification email", async () => {
    const dummyUser = {
      firstName: "Test",
      lastName: "User",
      email: "testuser+ru3329@mailinator.com",
      password: "123456",
      phoneCountryCode: "+91",
      phone: "9916812170",
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
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("fails if firstName, lastName, email, or password are not provided", async () => {
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

    await request(app).post("/auth/signup").send(dummyUsers[0]).expect(400);
    await request(app).post("/auth/signup").send(dummyUsers[1]).expect(400);
    await request(app).post("/auth/signup").send(dummyUsers[2]).expect(400);
    await request(app).post("/auth/signup").send(dummyUsers[3]).expect(400);
  });

  it("fails if supplied email, password, or phone number are invalid", async () => {
    const dummyUsers = [
      {
        firstName: "Test",
        lastName: "User",
        email: "testuser+ru3329", // invalid
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
        phone: "1111111111", // missing phoneCountryCode
      },
      {
        firstName: "Test",
        lastName: "User",
        email: "testuser+ru3329@mailinator.com",
        password: "123456",
        phoneCountryCode: "+91",
        phone: "abc", // invalid
      },
    ];

    await request(app).post("/auth/signup").send(dummyUsers[0]).expect(400);
    await request(app).post("/auth/signup").send(dummyUsers[1]).expect(400);
    await request(app).post("/auth/signup").send(dummyUsers[2]).expect(400);
    await request(app).post("/auth/signup").send(dummyUsers[3]).expect(400);
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

describe("send email sign-in link", () => {
  it("sends email if user exists", async () => {
    const dummyUser = {
      firstName: "Test",
      lastName: "User",
      email: "testuser@mailinator.com",
      password: "123456",
      phoneCountryCode: "+91",
      phone: "9916812170",
    };

    await request(app).post("/auth/signup").send(dummyUser);

    await request(app)
      .post("/auth/send_email_verification_link")
      .send({ email: dummyUser.email })
      .expect(200, { message: "VERIFICATION_EMAIL_SENT" });

    expect(mockSendEmail.mock.calls.length).toBe(2);
  });

  it("allows a redirectUrl to be specified", async () => {
    const dummyUser = {
      firstName: "Test",
      lastName: "User",
      email: "testuser@mailinator.com",
      password: "123456",
      phoneCountryCode: "+91",
      phone: "9916812170",
    };
    const redirectUrl = "https://www.google.com";

    await request(app).post("/auth/signup").send(dummyUser);

    await request(app)
      .post("/auth/send_email_verification_link")
      .send({ email: dummyUser.email, redirectUrl })
      .expect(200, { message: "VERIFICATION_EMAIL_SENT" });

    expect(mockSendEmail.mock.calls.length).toBe(2);
  });

  it("fails if email not specified", async () => {
    await request(app)
      .post("/auth/send_email_verification_link")
      .send({})
      .expect(400);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("fails if provided email or redirectUrl are invalid", async () => {
    await request(app)
      .post("/auth/send_email_verification_link")
      .send({ email: "invalidemail" })
      .expect(400);

    await request(app)
      .post("/auth/send_email_verification_link")
      .send({ email: "validemail@mailinator.com", redirectUrl: "invalidurl" })
      .expect(400);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("fails silently if no user with provided email", async () => {
    await request(app)
      .post("/auth/send_email_verification_link")
      .send({ email: "doesnotexist@mailinator.com" })
      .expect(200, { message: "VERIFICATION_EMAIL_SENT" });

    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
