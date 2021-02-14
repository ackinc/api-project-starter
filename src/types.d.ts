import User from "./entities/User.entity";

declare module "express-session" {
  interface Session {
    user?: User;
  }
}
