export type Source = "web" | "api" | "mcp";

export type Confession = {
  id: string;
  confession: string;
  timestamp: number;
  ipHash: string;
  read: boolean;
  source: Source;
  agentName?: string;
};

export const MIN_LENGTH = 10;
export const MAX_LENGTH = 500;
export const MAX_AGENT_NAME = 60;
export const RATE_LIMIT_SECONDS = 15 * 60;

const SALT = "ai-crimes-salt";

export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ip}:${SALT}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function isRateLimited(
  kv: KVNamespace,
  ipHash: string,
): Promise<boolean> {
  return (await kv.get(`ratelimit:${ipHash}`)) !== null;
}

export async function markRateLimit(
  kv: KVNamespace,
  ipHash: string,
): Promise<void> {
  await kv.put(`ratelimit:${ipHash}`, "1", {
    expirationTtl: RATE_LIMIT_SECONDS,
  });
}

export async function storeConfession(
  kv: KVNamespace,
  input: {
    confession: string;
    ipHash: string;
    source: Source;
    agentName?: string;
  },
): Promise<Confession> {
  const timestamp = Date.now();
  const id = crypto.randomUUID();
  const submission: Confession = {
    id,
    confession: input.confession,
    timestamp,
    ipHash: input.ipHash,
    read: false,
    source: input.source,
    agentName: input.agentName,
  };
  await kv.put(`confession:${timestamp}:${id}`, JSON.stringify(submission));
  return submission;
}

export function validateLength(
  confession: string,
): { ok: true } | { ok: false; error: string } {
  if (confession.length < MIN_LENGTH) {
    return { ok: false, error: `confession must be at least ${MIN_LENGTH} characters` };
  }
  if (confession.length > MAX_LENGTH) {
    return { ok: false, error: `confession must be at most ${MAX_LENGTH} characters` };
  }
  return { ok: true };
}
