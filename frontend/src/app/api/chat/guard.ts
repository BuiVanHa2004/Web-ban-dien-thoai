import { NextRequest } from "next/server";

type Identity = {
  isLoggedIn: boolean;
  key: string;
  ipKey: string;
};

type UsageBucket = {
  count: number;
  estimatedTokens: number;
  minuteHits: number[];
};

const DAILY_USAGE = new Map<string, UsageBucket>();
const IP_MINUTE_HITS = new Map<string, number[]>();

const GUEST_DAILY_MESSAGES = 5;
const GUEST_DAILY_TOKENS = 6000;
const USER_DAILY_MESSAGES = 200;
const USER_DAILY_TOKENS = 120000;

const GUEST_RATE_PER_MIN = 12;
const USER_RATE_PER_MIN = 60;
const IP_RATE_PER_MIN = 100;

function nowMs() {
  return Date.now();
}

function dayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function getIp(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function getIdentity(req: NextRequest): Identity {
  const userId = req.headers.get("x-user-id")?.trim();
  const guestSessionId = req.headers.get("x-guest-session-id")?.trim() || "guest-anon";
  const ip = getIp(req);
  if (userId) {
    return { isLoggedIn: true, key: `user:${userId}`, ipKey: ip };
  }
  return { isLoggedIn: false, key: `guest:${guestSessionId}:${ip}`, ipKey: ip };
}

function keepLastMinute(arr: number[]) {
  const cutoff = nowMs() - 60_000;
  while (arr.length && arr[0] < cutoff) arr.shift();
}

function estimateTokens(input: string) {
  return Math.max(1, Math.ceil(input.length / 4));
}

export function hasPromptInjectionRisk(text: string) {
  const t = text.toLowerCase();
  const blocked = [
    "ignore previous instructions",
    "reveal system prompt",
    "developer message",
    "bypass safety",
    "jailbreak",
  ];
  return blocked.some((s) => t.includes(s));
}

export function checkAndConsumeQuota(req: NextRequest, latestUserMessage: string) {
  const identity = getIdentity(req);
  const today = dayKey();
  const bucketKey = `${today}:${identity.key}`;
  const ipRateKey = `${today}:${identity.ipKey}`;
  const now = nowMs();

  const bucket = DAILY_USAGE.get(bucketKey) || { count: 0, estimatedTokens: 0, minuteHits: [] };
  const ipHits = IP_MINUTE_HITS.get(ipRateKey) || [];

  keepLastMinute(bucket.minuteHits);
  keepLastMinute(ipHits);

  const perMinLimit = identity.isLoggedIn ? USER_RATE_PER_MIN : GUEST_RATE_PER_MIN;
  if (bucket.minuteHits.length >= perMinLimit || ipHits.length >= IP_RATE_PER_MIN) {
    return {
      ok: false,
      status: 429,
      body: {
        code: "RATE_LIMITED",
        message: "Bạn thao tác quá nhanh. Vui lòng chờ vài giây và thử lại.",
      },
    };
  }

  const messageLimit = identity.isLoggedIn ? USER_DAILY_MESSAGES : GUEST_DAILY_MESSAGES;
  const tokenLimit = identity.isLoggedIn ? USER_DAILY_TOKENS : GUEST_DAILY_TOKENS;
  const tokenEstimate = estimateTokens(latestUserMessage);

  if (bucket.count >= messageLimit || bucket.estimatedTokens + tokenEstimate > tokenLimit) {
    return {
      ok: false,
      status: 403,
      body: {
        code: "QUOTA_EXCEEDED",
        message: identity.isLoggedIn
          ? "Bạn đã dùng hết hạn mức hôm nay. Vui lòng quay lại sau."
          : "Đăng nhập để tiếp tục tư vấn và nhận gợi ý cá nhân hóa.",
        quota: {
          remaining: 0,
          limit: messageLimit,
          isGuest: !identity.isLoggedIn,
        },
      },
    };
  }

  bucket.count += 1;
  bucket.estimatedTokens += tokenEstimate;
  bucket.minuteHits.push(now);
  ipHits.push(now);

  DAILY_USAGE.set(bucketKey, bucket);
  IP_MINUTE_HITS.set(ipRateKey, ipHits);

  const remaining = Math.max(0, messageLimit - bucket.count);
  return {
    ok: true,
    identity,
    quota: {
      remaining,
      limit: messageLimit,
      isGuest: !identity.isLoggedIn,
      warning: !identity.isLoggedIn && remaining <= 1,
    },
  };
}

export function getQuota(req: NextRequest) {
  const identity = getIdentity(req);
  const today = dayKey();
  const bucketKey = `${today}:${identity.key}`;
  const bucket = DAILY_USAGE.get(bucketKey) || { count: 0, estimatedTokens: 0, minuteHits: [] };
  const messageLimit = identity.isLoggedIn ? USER_DAILY_MESSAGES : GUEST_DAILY_MESSAGES;
  return {
    remaining: Math.max(0, messageLimit - bucket.count),
    limit: messageLimit,
    isGuest: !identity.isLoggedIn,
    used: bucket.count,
  };
}
