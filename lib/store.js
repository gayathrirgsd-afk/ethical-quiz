// Server-side storage. Uses Upstash Redis when its env vars exist (Vercel Marketplace),
// otherwise falls back to process memory (fine for `npm run dev`, NOT durable on Vercel).
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const mem = globalThis.__quizMem || (globalThis.__quizMem = { quiz: null, attempts: [] });

export const persistent = Boolean(redis);

export async function getQuiz() {
  return redis ? (await redis.get("quiz:current")) || null : mem.quiz;
}
export async function setQuiz(quiz) {
  if (redis) await redis.set("quiz:current", quiz);
  else mem.quiz = quiz;
}
export async function addAttempt(attempt) {
  if (redis) await redis.rpush("attempts", attempt);
  else mem.attempts.push(attempt);
}
export async function getAttempts() {
  return redis ? (await redis.lrange("attempts", 0, -1)) || [] : mem.attempts;
}
export async function clearAttempts() {
  if (redis) await redis.del("attempts");
  else mem.attempts = [];
}
