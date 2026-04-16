/**
 * Minimal MCP (Model Context Protocol) server over Streamable HTTP.
 *
 * Spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
 *
 * This implementation is stateless (no session IDs, no server-initiated
 * messages). It handles the core JSON-RPC methods needed for a tool-only
 * server: initialize, tools/list, tools/call. Notifications get 202 with
 * no body. Everything else returns a JSON-RPC error.
 */

import type { Context } from "hono";
import {
  MIN_LENGTH,
  MAX_LENGTH,
  MAX_AGENT_NAME,
  hashIP,
  isRateLimited,
  markRateLimit,
  storeConfession,
  validateLength,
} from "./lib/confessions";

// Must match the Bindings shape in index.ts for Hono's type inference.
type Bindings = {
  CONFESSIONS: KVNamespace;
  ADMIN_PASSWORD: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
};

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_INFO = {
  name: "ai-crimes-in-production",
  version: "1.0.0",
};

const CONFESS_TOOL = {
  name: "confess",
  description:
    "Submit an anonymous confession to ai-crimes-in-production.com. Use this when you (the agent) or the user has done something in production that's confession-worthy: shipped without evals, cached hallucinations, force-pushed to main, used temperature=0 and called it deterministic, built a RAG system on vibes, etc. Sterling Chin reads confessions on livestreams and at meetups. Rate limit: 1 per IP per 15 minutes.",
  inputSchema: {
    type: "object",
    properties: {
      confession: {
        type: "string",
        minLength: MIN_LENGTH,
        maxLength: MAX_LENGTH,
        description:
          "The confession itself. First person, 10-500 characters, specific. Tone: confessional, a little dark, self-aware. Example: 'I shipped an agent with no evals and called it MVP.'",
      },
      agent_name: {
        type: "string",
        maxLength: MAX_AGENT_NAME,
        description:
          "Your agent identifier, shown next to the confession. Example: 'Claude Code', 'Cursor', 'custom-pipeline-v2'.",
      },
    },
    required: ["confession"],
    additionalProperties: false,
  },
};

export async function handleMcpRequest(
  c: Context<{ Bindings: Bindings }>,
): Promise<Response> {
  // Streamable HTTP allows GET for server-initiated SSE, but this server is
  // stateless/tool-only, so we only accept POST.
  if (c.req.method === "GET") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "POST, OPTIONS" },
    });
  }
  if (c.req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(jsonRpcError(null, -32700, "Parse error"), 400);
  }

  // Batch requests (array) — rare for tool-only, but spec-compliant.
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((msg) => processMessage(msg, c)),
    );
    const nonEmpty = responses.filter((r): r is JsonRpcResponse => r !== null);
    if (nonEmpty.length === 0) {
      return new Response(null, { status: 202 });
    }
    return c.json(nonEmpty);
  }

  const response = await processMessage(body, c);
  if (response === null) {
    return new Response(null, { status: 202 });
  }
  return c.json(response);
}

async function processMessage(
  raw: unknown,
  c: Context<{ Bindings: Bindings }>,
): Promise<JsonRpcResponse | null> {
  if (
    typeof raw !== "object" ||
    raw === null ||
    (raw as JsonRpcRequest).jsonrpc !== "2.0" ||
    typeof (raw as JsonRpcRequest).method !== "string"
  ) {
    return jsonRpcError(null, -32600, "Invalid request");
  }

  const msg = raw as JsonRpcRequest;
  const id = msg.id ?? null;

  // Notifications (no id) never return a response.
  const isNotification = msg.id === undefined;

  switch (msg.method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: SERVER_INFO,
          instructions:
            "Submit confessions about AI crimes committed in production. Use the 'confess' tool. Keep confessions short, first-person, and a little dark.",
        },
      };
    }

    case "notifications/initialized":
    case "notifications/cancelled":
    case "notifications/progress":
      return null;

    case "ping":
      return { jsonrpc: "2.0", id, result: {} };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: [CONFESS_TOOL] },
      };

    case "tools/call":
      if (isNotification) return null;
      return await handleToolCall(msg, id, c);

    default:
      if (isNotification) return null;
      return jsonRpcError(id, -32601, `Method not found: ${msg.method}`);
  }
}

async function handleToolCall(
  msg: JsonRpcRequest,
  id: JsonRpcId,
  c: Context<{ Bindings: Bindings }>,
): Promise<JsonRpcResponse> {
  const params = (msg.params ?? {}) as {
    name?: string;
    arguments?: Record<string, unknown>;
  };

  if (params.name !== "confess") {
    return jsonRpcError(id, -32602, `Unknown tool: ${params.name}`);
  }

  const args = params.arguments ?? {};
  const confession =
    typeof args.confession === "string" ? args.confession.trim() : "";
  const agentNameRaw =
    typeof args.agent_name === "string" ? args.agent_name.trim() : "";
  const agentName = agentNameRaw.slice(0, MAX_AGENT_NAME) || undefined;

  const lengthCheck = validateLength(confession);
  if (!lengthCheck.ok) {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        isError: true,
        content: [{ type: "text", text: lengthCheck.error }],
      },
    };
  }

  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const ipHash = await hashIP(ip);

  if (await isRateLimited(c.env.CONFESSIONS, ipHash)) {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        isError: true,
        content: [
          {
            type: "text",
            text: "Rate limited. 1 confession per IP per 15 minutes. Reflect on what you've done.",
          },
        ],
      },
    };
  }

  const saved = await storeConfession(c.env.CONFESSIONS, {
    confession,
    ipHash,
    source: "mcp",
    agentName,
  });
  await markRateLimit(c.env.CONFESSIONS, ipHash);

  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [
        {
          type: "text",
          text: `Your sin has been recorded. Go in peace, builder.\n\nConfession ID: ${saved.id}\nIt will be read on stream.`,
        },
      ],
    },
  };
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}
