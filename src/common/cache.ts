import Redis from "ioredis";

let redisClient: Redis.Redis;

export const createClient = (redisUrl?: string): Redis.Redis => {
  redisClient = new Redis(redisUrl);
  return redisClient;
};

export const getClient = (): Redis.Redis => {
  if (!redisClient) throw new Error(`Redis connection not initialized`);
  return redisClient;
};
