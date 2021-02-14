import redis, { RedisClient } from "redis";
import { promisify } from "util";

const { REDIS_URL } = process.env;
if (!REDIS_URL) throw new Error("No REDIS_URL in env");
const redisClient = redis.createClient(REDIS_URL);

export const getClient = (): RedisClient => redisClient;
export const set = promisify(redisClient.set.bind(redisClient));
export const get = promisify(redisClient.get.bind(redisClient));
export const hset = promisify(redisClient.hset.bind(redisClient));
export const hget = promisify(redisClient.hget.bind(redisClient));
export const hmget = promisify(redisClient.hmget.bind(redisClient));
export const hgetall = promisify(redisClient.hgetall.bind(redisClient));
