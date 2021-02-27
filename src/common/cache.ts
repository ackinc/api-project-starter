import Redis from "ioredis";
import { redisUrl } from "../config";

const redisClient = new Redis(redisUrl);
export default redisClient;
