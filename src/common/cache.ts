import redis, { RedisClient } from "redis";
import { promisify } from "util";

import { redisUrl } from "../config";

const redisClient = redis.createClient(redisUrl);

export const getClient = (): RedisClient => redisClient;
export const set = promisify(redisClient.set.bind(redisClient));
export const get = promisify(redisClient.get.bind(redisClient));
export const hset = promisify(redisClient.hset.bind(redisClient));
export const hget = promisify(redisClient.hget.bind(redisClient));
export const hmget = promisify(redisClient.hmget.bind(redisClient));
export const hgetall = promisify(redisClient.hgetall.bind(redisClient));
