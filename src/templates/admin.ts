type Source = "web" | "api" | "mcp";

type Confession = {
  id: string;
  confession: string;
  timestamp: number;
  ipHash: string;
  read: boolean;
  source?: Source;
  agentName?: string;
};

type Entry = { key: string; data: Confession };

export function adminHTML(confessions: Entry[]): string {
  const totalCount = confessions.length;
  const unreadCount = confessions.filter((c) => !c.data.read).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Confessional Admin — ${totalCount} sins</title>
<meta name="robots" content="noindex, nofollow" />
<style>
  :root {
    --bg: #0a0a0a;
    --panel: #141414;
    --border: #2a2a2a;
    --accent: #ff3300;
    --text: #e8e8e8;
    --muted: #888;
    --unread: #ffd700;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    padding: 16px;
  }
  @media (min-width: 600px) {
    body { padding: 24px; }
  }
  header {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
  }
  h1 span { color: var(--accent); }
  .stats {
    display: flex;
    gap: 20px;
    font-size: 14px;
    color: var(--muted);
  }
  .stats strong { color: var(--text); font-weight: 600; }
  .stats .unread strong { color: var(--unread); }
  .list { display: flex; flex-direction: column; gap: 12px; }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    padding: 16px 18px;
    border-radius: 6px;
  }
  .card.read {
    border-left-color: var(--border);
    opacity: 0.6;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 10px;
    font-family: "SF Mono", Menlo, monospace;
  }
  .card-head .status {
    color: var(--unread);
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .card.read .status { color: var(--muted); }
  .badge {
    display: inline-block;
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 10px;
    margin-right: 6px;
    letter-spacing: 0.5px;
    font-weight: 600;
    vertical-align: 1px;
  }
  .badge.api {
    background: rgba(124, 58, 237, 0.15);
    color: #c4b5fd;
    border: 1px solid rgba(124, 58, 237, 0.4);
  }
  .badge.mcp {
    background: rgba(236, 72, 153, 0.15);
    color: #f9a8d4;
    border: 1px solid rgba(236, 72, 153, 0.4);
  }
  .badge.web {
    background: rgba(16, 185, 129, 0.12);
    color: #86efac;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  .agent-name {
    font-size: 11px;
    color: #c4b5fd;
    font-family: "SF Mono", Menlo, monospace;
  }
  .confession {
    font-size: 16px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .card-foot {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }
  form { display: inline; }
  button {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
  }
  button:hover { border-color: var(--accent); color: var(--accent); }
  .delete { color: var(--muted); }
  .delete:hover { border-color: #ff0000; color: #ff4444; }
  .empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--muted);
    font-size: 18px;
  }
  .meta {
    font-family: "SF Mono", Menlo, monospace;
    font-size: 11px;
  }
  .hash {
    color: #555;
  }
</style>
</head>
<body>

<header>
  <h1>Confessional <span>Admin</span></h1>
  <div class="stats">
    <div><strong>${totalCount}</strong> total</div>
    <div class="unread"><strong>${unreadCount}</strong> unread</div>
  </div>
</header>

${
  confessions.length === 0
    ? `<div class="empty">No confessions yet. The machine waits.</div>`
    : `<div class="list">${confessions.map((e) => renderCard(e)).join("")}</div>`
}

</body>
</html>`;
}

function renderCard(entry: Entry): string {
  const { key, data } = entry;
  const when = new Date(data.timestamp);
  const dateStr = when.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const readClass = data.read ? "read" : "";
  const statusLabel = data.read ? "READ ON STREAM" : "UNREAD";
  const toggleLabel = data.read ? "Mark unread" : "Mark read on stream";
  const source = data.source ?? "web";
  const badge =
    source === "mcp"
      ? `<span class="badge mcp">🧠 MCP</span>`
      : source === "api"
        ? `<span class="badge api">🤖 API</span>`
        : `<span class="badge web">HUMAN</span>`;
  const agentName = data.agentName
    ? `<span class="agent-name">${escapeHTML(data.agentName)}</span>`
    : "";

  return `
    <div class="card ${readClass}">
      <div class="card-head">
        <span class="meta">${badge}${agentName} ${agentName ? "&middot; " : ""}${dateStr} &middot; <span class="hash">${data.ipHash}</span></span>
        <span class="status">${statusLabel}</span>
      </div>
      <div class="confession">${escapeHTML(data.confession)}</div>
      <div class="card-foot">
        <form method="post" action="/admin/toggle-read">
          <input type="hidden" name="key" value="${escapeHTML(key)}" />
          <button type="submit">${toggleLabel}</button>
        </form>
        <form method="post" action="/admin/delete" onsubmit="return confirm('Delete this confession forever?');">
          <input type="hidden" name="key" value="${escapeHTML(key)}" />
          <button type="submit" class="delete">Delete</button>
        </form>
      </div>
    </div>
  `;
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
