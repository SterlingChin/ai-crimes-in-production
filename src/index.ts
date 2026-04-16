import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { basicAuth } from "hono/basic-auth";
import { cors } from "hono/cors";
import { homeHTML } from "./templates/home";
import { successHTML, errorHTML, rateLimitHTML } from "./templates/result";
import { adminHTML } from "./templates/admin";
import {
  llmsTxt,
  robotsTxt,
  sitemapXml,
  openApiJson,
  apiCatalog,
} from "./templates/discovery";

type Bindings = {
  CONFESSIONS: KVNamespace;
  ADMIN_PASSWORD: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
};

type Source = "web" | "api";

type Confession = {
  id: string;
  confession: string;
  timestamp: number;
  ipHash: string;
  read: boolean;
  source: Source;
  agentName?: string;
};

const RATE_LIMIT_SECONDS = 15 * 60;
const MIN_LENGTH = 10;
const MAX_LENGTH = 500;
const MAX_AGENT_NAME = 60;

const app = new Hono<{ Bindings: Bindings }>();

/* ---------- Agent-first discovery endpoints ---------- */

app.get("/llms.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(llmsTxt());
});

app.get("/robots.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "public, max-age=86400");
  return c.body(robotsTxt());
});

app.get("/sitemap.xml", (c) => {
  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=86400");
  return c.body(sitemapXml());
});

app.get("/openapi.json", (c) => {
  c.header("Cache-Control", "public, max-age=3600");
  c.header("Access-Control-Allow-Origin", "*");
  return c.json(openApiJson());
});

app.get("/api", (c) => {
  c.header("Cache-Control", "public, max-age=3600");
  c.header("Access-Control-Allow-Origin", "*");
  return c.json(apiCatalog());
});

/* ---------- Home (with content negotiation + discovery hints) ---------- */

app.get("/", (c) => {
  const accept = c.req.header("accept") ?? "";
  const wantsJSON =
    accept.includes("application/json") && !accept.includes("text/html");

  if (wantsJSON) {
    c.header("Cache-Control", "public, max-age=3600");
    return c.json(apiCatalog());
  }

  c.header(
    "Link",
    [
      `</openapi.json>; rel="service-desc"; type="application/json"`,
      `</api>; rel="service-meta"; type="application/json"`,
      `</llms.txt>; rel="alternate"; type="text/plain"; title="LLM-friendly site description"`,
    ].join(", "),
  );
  return c.html(homeHTML(c.env.TURNSTILE_SITE_KEY));
});

app.post("/confess", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";

  const rateLimitKey = `ratelimit:${await hashIP(ip)}`;
  if (await c.env.CONFESSIONS.get(rateLimitKey)) {
    return c.html(rateLimitHTML(), 429);
  }

  const form = await c.req.formData();
  const confession = String(form.get("confession") ?? "").trim();
  const turnstileToken = String(form.get("cf-turnstile-response") ?? "");
  const honeypot = String(form.get("website") ?? "");

  if (honeypot) {
    return c.html(successHTML());
  }

  if (confession.length < MIN_LENGTH || confession.length > MAX_LENGTH) {
    return c.html(
      errorHTML(
        `Your sin must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters. Try harder.`,
      ),
    );
  }

  const turnstileOk = await verifyTurnstile(
    turnstileToken,
    ip,
    c.env.TURNSTILE_SECRET_KEY,
  );
  if (!turnstileOk) {
    return c.html(errorHTML("The confessional doubts your humanity."));
  }

  await storeConfession(c.env.CONFESSIONS, {
    confession,
    ipHash: await hashIP(ip),
    source: "web",
  });
  await c.env.CONFESSIONS.put(rateLimitKey, "1", {
    expirationTtl: RATE_LIMIT_SECONDS,
  });

  return c.html(successHTML());
});

/* ---------- JSON API: agents confess here ---------- */

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  }),
);

app.post("/api/confess", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const ipHash = await hashIP(ip);

  const rateLimitKey = `ratelimit:${ipHash}`;
  if (await c.env.CONFESSIONS.get(rateLimitKey)) {
    return c.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Reflect on what you've done. Try again in 15 minutes.",
      },
      429,
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { ok: false, error: "invalid_json", message: "Body must be JSON." },
      400,
    );
  }

  if (typeof body !== "object" || body === null) {
    return c.json(
      { ok: false, error: "invalid_body", message: "Body must be a JSON object." },
      400,
    );
  }

  const b = body as Record<string, unknown>;
  const confession = typeof b.confession === "string" ? b.confession.trim() : "";
  const agentNameRaw = typeof b.agent_name === "string" ? b.agent_name.trim() : "";
  const agentName = agentNameRaw.slice(0, MAX_AGENT_NAME) || undefined;

  if (confession.length < MIN_LENGTH || confession.length > MAX_LENGTH) {
    return c.json(
      {
        ok: false,
        error: "invalid_length",
        message: `confession must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`,
      },
      400,
    );
  }

  const saved = await storeConfession(c.env.CONFESSIONS, {
    confession,
    ipHash,
    source: "api",
    agentName,
  });

  await c.env.CONFESSIONS.put(rateLimitKey, "1", {
    expirationTtl: RATE_LIMIT_SECONDS,
  });

  return c.json({
    ok: true,
    id: saved.id,
    message: "Your sin has been recorded. Go in peace, builder.",
  });
});

const adminAuth: MiddlewareHandler<{ Bindings: Bindings }> = (c, next) =>
  basicAuth({ username: "admin", password: c.env.ADMIN_PASSWORD })(c, next);

app.use("/admin", adminAuth);
app.use("/admin/*", adminAuth);

app.get("/admin", async (c) => {
  const list = await c.env.CONFESSIONS.list({ prefix: "confession:" });
  const entries = await Promise.all(
    list.keys.map(async (k) => {
      const val = await c.env.CONFESSIONS.get(k.name);
      return val ? { key: k.name, data: JSON.parse(val) as Confession } : null;
    }),
  );

  const confessions = entries
    .filter((e): e is { key: string; data: Confession } => e !== null)
    .sort((a, b) => b.data.timestamp - a.data.timestamp);

  return c.html(adminHTML(confessions));
});

app.post("/admin/toggle-read", async (c) => {
  const form = await c.req.formData();
  const key = String(form.get("key") ?? "");
  if (!key.startsWith("confession:")) {
    return c.redirect("/admin");
  }
  const val = await c.env.CONFESSIONS.get(key);
  if (val) {
    const sub = JSON.parse(val) as Confession;
    sub.read = !sub.read;
    await c.env.CONFESSIONS.put(key, JSON.stringify(sub));
  }
  return c.redirect("/admin");
});

app.post("/admin/delete", async (c) => {
  const form = await c.req.formData();
  const key = String(form.get("key") ?? "");
  if (key.startsWith("confession:")) {
    await c.env.CONFESSIONS.delete(key);
  }
  return c.redirect("/admin");
});

async function storeConfession(
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

async function verifyTurnstile(
  token: string,
  ip: string,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  form.append("remoteip", ip);
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ip}:ai-crimes-salt`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export default app;
