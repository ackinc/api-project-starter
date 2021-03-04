/**
 * @jest-environment node
 */

jest.mock("./common/email");
jest.mock("./common/sms");

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.test") });

import _ from "lodash";
import request, { SuperAgentTest } from "supertest";
import {
  Connection,
  createConnection as createDbConnection,
  getRepository,
  Repository,
} from "typeorm";

import createApp from "./app";
import { createClient } from "./common/cache";
import sendEmail from "./common/email";
import sendSMS from "./common/sms";
import { cookieSecrets, databaseUrl, redisUrl } from "./config";
import User from "./entities/User.entity";

const toDo = () => false;

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

let userRepository: Repository<User>;
const dummyUser = {
  firstName: "Anirudh",
  lastName: "Nimmagadda",
  email: "anirudh.nimmagadda@gmail.com",
  password: "123456",
  phoneCountryCode: "+91",
  phone: "9916812170",
};
const anotherDummyUser = {
  firstName: "Vikash",
  lastName: "Bijarnia",
  email: "vikash.bijarnia@mailinator.com",
  password: "qwerty",
};

beforeAll(async () => {
  dbConnection = await createDbConnection({
    type: "postgres",
    url: databaseUrl,
    entities: [User],
    dropSchema: true,
    synchronize: true,
  });
  userRepository = getRepository(User);
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

describe("auth routes", () => {
  describe("signup", () => {
    it("creates user in DB and triggers verification email", async () => {
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
        _.omit(dummyUser, ["firstName", "phoneCountryCode", "phone"]),
        _.omit(dummyUser, ["lastName", "phoneCountryCode", "phone"]),
        _.omit(dummyUser, ["email", "phoneCountryCode", "phone"]),
        _.omit(dummyUser, ["password", "phoneCountryCode", "phone"]),
      ];

      await request(app).post("/auth/signup").send(dummyUsers[0]).expect(400);
      await request(app).post("/auth/signup").send(dummyUsers[1]).expect(400);
      await request(app).post("/auth/signup").send(dummyUsers[2]).expect(400);
      await request(app).post("/auth/signup").send(dummyUsers[3]).expect(400);
    });

    it("fails if supplied email, password, or phone number are invalid", async () => {
      const dummyUsers = [
        { ...dummyUser, email: "invalid" },
        { ...dummyUser, password: "short" },
        { ...dummyUser, phoneCountryCode: undefined },
        { ...dummyUser, phone: "invalid" },
      ];

      await request(app).post("/auth/signup").send(dummyUsers[0]).expect(400);
      await request(app).post("/auth/signup").send(dummyUsers[1]).expect(400);
      await request(app).post("/auth/signup").send(dummyUsers[2]).expect(400);
      await request(app).post("/auth/signup").send(dummyUsers[3]).expect(400);
    });

    it("does not create user if email already in use", async () => {
      await request(app).post("/auth/signup").send(dummyUser).expect(200, {
        message: "VERIFICATION_EMAIL_SENT",
      });

      const dummyUser2 = {
        ...anotherDummyUser,
        email: dummyUser.email,
      };
      await request(app).post("/auth/signup").send(dummyUser2).expect(400, {
        error: "EMAIL_TAKEN",
      });
    });

    it("does not create user if phone already in use", async () => {
      await request(app).post("/auth/signup").send(dummyUser).expect(200, {
        message: "VERIFICATION_EMAIL_SENT",
      });

      const dummyUser2 = {
        ...anotherDummyUser,
        phoneCountryCode: "+91",
        phone: "9916812170",
      };
      await request(app).post("/auth/signup").send(dummyUser2).expect(400, {
        error: "PHONE_TAKEN",
      });
    });
  });

  describe("send email sign-in link", () => {
    it("sends email if user exists", async () => {
      await request(app).post("/auth/signup").send(dummyUser);

      await request(app)
        .post("/auth/send_email_verification_link")
        .send({ email: dummyUser.email })
        .expect(200, { message: "VERIFICATION_EMAIL_SENT" });

      expect(mockSendEmail.mock.calls.length).toBe(2);
    });

    it("allows a redirectUrl to be specified", async () => {
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

  describe("send phone verification code", () => {
    it("sends SMS if user exists", async () => {
      await request(app).post("/auth/signup").send(dummyUser);

      await request(app)
        .post("/auth/send_phone_verification_code")
        .send({
          phoneCountryCode: dummyUser.phoneCountryCode,
          phone: dummyUser.phone,
        })
        .expect(200, { message: "VERIFICATION_SMS_SENT" });

      expect(mockSendSMS).toHaveBeenCalled();
    });

    it("fails if phone missing or invalid", async () => {
      // phone missing
      await request(app)
        .post("/auth/send_phone_verification_code")
        .send({})
        .expect(400);

      // phone invalid - no phoneCountryCode
      await request(app)
        .post("/auth/send_phone_verification_code")
        .send({ phone: dummyUser.phone })
        .expect(400);

      // phone invalid
      await request(app)
        .post("/auth/send_phone_verification_code")
        .send({
          phoneCountryCode: dummyUser.phoneCountryCode,
          phone: "invalid",
        })
        .expect(400);

      expect(mockSendSMS).not.toHaveBeenCalled();
    });
  });

  describe("send password-reset link", () => {
    it("sends email if user exists and redirectUrl provided", async () => {
      await request(app).post("/auth/signup").send(dummyUser);

      const redirectUrl = "https://ae-frontend.com/account";
      await request(app)
        .post("/auth/send_password_reset_link")
        .send({ email: dummyUser.email, redirectUrl })
        .expect(200, { message: "VERIFICATION_EMAIL_SENT" });

      expect(mockSendEmail.mock.calls.length).toBe(2);
    });

    it("fails if email or redirectUrl are missing/invalid", async () => {
      const redirectUrl = "https://ae-frontend.com/account";

      await request(app)
        .post("/auth/send_password_reset_link")
        .send({ email: dummyUser.email })
        .expect(400);

      await request(app)
        .post("/auth/send_password_reset_link")
        .send({ redirectUrl })
        .expect(400);

      await request(app)
        .post("/auth/send_password_reset_link")
        .send({ email: "invalid", redirectUrl })
        .expect(400);

      await request(app)
        .post("/auth/send_password_reset_link")
        .send({ email: dummyUser.email, redirectUrl: "invalid" })
        .expect(400);

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("fails silently if no user with provided email", async () => {
      const redirectUrl = "https://ae-frontend.com/account";
      await request(app)
        .post("/auth/send_password_reset_link")
        .send({ email: "doesnotexist@mailinator.com", redirectUrl })
        .expect(200, { message: "VERIFICATION_EMAIL_SENT" });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("login with password", () => {
    beforeEach(async () => {
      await request(app).post("/auth/signup").send(dummyUser);
    });

    it("allows emailVerified user to login with email and password", async () => {
      const userRepository = getRepository(User);
      await userRepository.update(
        { email: dummyUser.email },
        { emailVerified: true }
      );

      await request(app)
        .post("/auth/login")
        .send({ emailOrPhone: dummyUser.email, password: dummyUser.password })
        .expect(200, { message: "LOGIN_SUCCESSFUL" });
    });

    it("allows phoneVerified user to login with phone and password", async () => {
      const userRepository = getRepository(User);
      await userRepository.update(
        { email: dummyUser.email },
        { phoneVerified: true }
      );

      await request(app)
        .post("/auth/login")
        .send({
          phoneCountryCode: dummyUser.phoneCountryCode,
          emailOrPhone: dummyUser.phone,
          password: dummyUser.password,
        })
        .expect(200, { message: "LOGIN_SUCCESSFUL" });
    });

    it("sends magic sign-in email if user tries to login with unverified email", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          emailOrPhone: dummyUser.email,
          password: dummyUser.password,
        })
        .expect(200, { message: "VERIFICATION_EMAIL_SENT" });

      expect(mockSendEmail).toHaveBeenCalled();
    });

    it("sends verification SMS if user tries to login with unverified phone", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          phoneCountryCode: dummyUser.phoneCountryCode,
          emailOrPhone: dummyUser.phone,
          password: dummyUser.password,
        })
        .expect(200, { message: "VERIFICATION_SMS_SENT" });

      expect(mockSendSMS).toHaveBeenCalled();
    });

    it("fails if email/phone are missing/invalid", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          phoneCountryCode: dummyUser.phoneCountryCode,
          password: dummyUser.password,
        })
        .expect(400);

      await request(app)
        .post("/auth/login")
        .send({
          phoneCountryCode: dummyUser.phoneCountryCode,
          emailOrPhone: "invalid",
          password: dummyUser.password,
        })
        .expect(400);
    });

    it("fails if no user with email/phone is found in DB", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          email: "nosuchemail@gmail.com",
          password: dummyUser.password,
        })
        .expect(400);

      await request(app)
        .post("/auth/login")
        .send({
          phoneCountryCode: dummyUser.phoneCountryCode,
          phone: "9916812171",
          password: dummyUser.password,
        })
        .expect(400);
    });

    it("fails if password is missing/incorrect", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          email: dummyUser.email,
        })
        .expect(400);

      await request(app)
        .post("/auth/login")
        .send({
          email: dummyUser.email,
          password: "incorrect",
        })
        .expect(400);
    });
  });

  describe("login with token", () => {
    beforeEach(async () => {
      await request(app).post("/auth/signup").send(dummyUser);
    });

    // TODO: check that emailVerified or phoneVerified are being set
    //   to true on successful login
    it("should log the user in if token is valid", async () => {
      // a user was just created (beforeEach), so there will be a token
      //   in the cache

      const token = await redisClient.get(`tokens:${dummyUser.email}`);
      const b64data = Buffer.from(`${dummyUser.email}::${token}`).toString(
        "base64"
      );
      await request(app)
        .post(`/auth/login/${b64data}`)
        .expect(200, { message: "LOGIN_SUCCESSFUL" });
    });

    it("should fail if token is invalid", async () => {
      await request(app).post("/auth/login/invalidtoken").expect(400);

      const b64data = Buffer.from(`${dummyUser.email}::invalidtoken`).toString(
        "base64"
      );
      await request(app).post(`/auth/login/${b64data}`).expect(400);
    });
  });

  describe("logout", () => {
    it("fails if called by unauthenticated user", async () => {
      await request(app).post("/auth/logout").expect(401);
    });
  });
});

describe("user routes", () => {
  let agent: SuperAgentTest;
  let user: User;

  beforeEach(async () => {
    await request(app).post("/auth/signup").send(dummyUser);

    const userRepository = getRepository(User);
    user = await userRepository.findOneOrFail({ email: dummyUser.email });
    user.emailVerified = true;
    await userRepository.save(user);

    agent = request.agent(app);
    await agent
      .post("/auth/login")
      .send({ emailOrPhone: dummyUser.email, password: dummyUser.password })
      .expect(200);

    mockSendEmail.mockClear();
  });

  describe("get user", () => {
    it("retrieves the details of specified user", async () => {
      await agent
        .get("/users/me")
        .expect(200)
        .then((res) => {
          const { id, email } = res.body.data;
          expect(id).toBe(user.id);
          expect(email).toBe(user.email);
        });

      await agent
        .get(`/users/${user.id}`)
        .expect(200)
        .then((res) => {
          const { id, email } = res.body.data;
          expect(id).toBe(user.id);
          expect(email).toBe(user.email);
        });
    });

    it("fails if specified user does not exist", async () => {
      await getRepository(User).delete(user.id as number);

      await agent.get(`/users/${user.id}`).expect(404);
    });

    it("fails if logged-in user does not have permission to access requested user", async () => {
      await request(app).post("/auth/signup").send(anotherDummyUser);

      const anotherUser = await getRepository(User).findOneOrFail({
        email: anotherDummyUser.email,
      });

      await agent.get(`/users/${anotherUser.id}`).expect(403);
    });
  });

  describe("update user", () => {
    it("updates user record with provided details", async () => {
      let updatedUser: User;

      const firstName = "Anirud";
      await agent.post("/users/me").send({ firstName });
      updatedUser = await userRepository.findOneOrFail(user.id);
      expect(updatedUser.firstName).toBe(firstName);

      const lastName = "Nimmagadd";
      await agent.post(`/users/${user.id}`).send({ lastName });
      updatedUser = await userRepository.findOneOrFail(user.id);
      expect(updatedUser.lastName).toBe(lastName);
    });

    it("sends verification email if trying to update email", async () => {
      const email = "anirudh.nimmagadda@mailinator.com";
      await agent.post("/users/me").send({ email });

      const updatedUser = await userRepository.findOneOrFail(user.id);
      expect(updatedUser.email).toBe(email);
      expect(updatedUser.emailVerified).toBe(false);
      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockSendEmail.mock.calls[0][0].to).toBe(email);
    });

    it("sends verification SMS if trying to update phoneCountryCode", async () => {
      const phoneCountryCode = "+1";
      await agent.post("/users/me").send({ phoneCountryCode });
      const updatedUser = await userRepository.findOneOrFail(user.id);
      expect(updatedUser.phoneCountryCode).toBe(phoneCountryCode);
      expect(updatedUser.phoneVerified).toBe(false);
      expect(mockSendSMS).toHaveBeenCalled();
      expect(mockSendSMS.mock.calls[0][0].to).toBe(
        `${updatedUser.phoneCountryCode}${updatedUser.phone}`
      );
    });

    it("sends verification SMS if trying to update phone", async () => {
      const phone = "9916812171";
      await agent.post("/users/me").send({ phone });
      const updatedUser = await userRepository.findOneOrFail(user.id);
      expect(updatedUser.phone).toBe(phone);
      expect(updatedUser.phoneVerified).toBe(false);
      expect(mockSendSMS).toHaveBeenCalled();
      expect(mockSendSMS.mock.calls[0][0].to).toBe(
        `${updatedUser.phoneCountryCode}${updatedUser.phone}`
      );
    });

    it("fails if user not authenticated", async () => {
      await request(app)
        .post(`/users/${user.id}`)
        .send({ firstName: "Ani" })
        .expect(401);
    });

    it("fails if target user not found", async () => {
      await userRepository.delete(user.id as number);

      await agent
        .post(`/users/${user.id}`)
        .send({ firstName: "Ani" })
        .expect(404);
    });

    it("fails if authenticated user not authorized", async () => {
      await request(app).post("/auth/signup").send(anotherDummyUser);
      const anotherUser = await userRepository.findOneOrFail({
        email: anotherDummyUser.email,
      });

      await agent
        .post(`/users/${anotherUser.id}`)
        .send({ firstName: "Vikas" })
        .expect(403);
    });

    // TODO: add check for invalid phoneCountryCode
    it("fails if trying to update with invalid password/email/phone", async () => {
      await agent
        .post(`/users/${user.id}`)
        .send({ password: "short" })
        .expect(400);

      await agent
        .post(`/users/${user.id}`)
        .send({ email: "invalid" })
        .expect(400);

      await agent
        .post(`/users/${user.id}`)
        .send({ phone: "invalid" })
        .expect(400);
    });
  });
});
