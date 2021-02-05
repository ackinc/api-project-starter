require("dotenv").config();
const express = require("express");
const session = require("express-session");
const redis = require("redis");
const RedisStore = require("connect-redis")(session);

const { COOKIE_SECRET, NODE_ENV, PORT, REDIS_URL } = process.env;

const app = express();
if (NODE_ENV !== "development") {
  app.set("trust proxy", 1);
}

const redisClient = redis.createClient(REDIS_URL);
app.use(
  session({
    name: "ae-sid",
    cookie: {
      httpOnly: true,
      maxAge: 7 * 365 * 86400 * 1000, // persists a week
      secure: NODE_ENV !== "development",
      sameSite: NODE_ENV !== "development" ? "none" : "strict",
    },
    resave: false,
    saveUninitialized: true,
    secret: COOKIE_SECRET,
    store: new RedisStore({ client: redisClient }),
    rolling: true,
  })
);

app.get("/", (req, res) => res.end("OK"));

app.listen(PORT, () => console.log("Server running"));
