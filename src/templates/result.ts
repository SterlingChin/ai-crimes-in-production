const resultLayout = (
  title: string,
  heading: string,
  body: string,
  emoji: string,
): string => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ctext y='52' font-size='56'%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E" />

<!-- Set theme BEFORE render to avoid flash -->
<script>
  (function() {
    var saved = localStorage.getItem('aicrimes-theme') || 'modern';
    if (saved !== 'modern' && saved !== '90s' && saved !== 'agent') saved = 'modern';
    document.documentElement.className = 'theme-' + saved;
  })();
</script>

<style>
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=Creepster&family=Press+Start+2P&family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    color: #fff;
  }

  /* ============================================================
     THEME: 90s — default Creepster/Comic Sans aesthetic
     ============================================================ */
  html.theme-90s body {
    background: #000 radial-gradient(circle at center, #330000 0%, #000 70%);
    color: #fff;
    font-family: "Comic Sans MS", cursive;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;
  }
  html.theme-90s .box {
    border: 6px double #ffd700;
    padding: 40px 30px;
    max-width: 520px;
    background: linear-gradient(180deg, #1a0000, #330000);
    box-shadow: 0 0 50px rgba(255,0,0,0.5);
  }
  html.theme-90s .emoji {
    font-size: 80px;
    animation: bob 1.5s ease-in-out infinite;
  }
  @keyframes bob {
    0%, 100% { transform: translateY(0) rotate(-3deg); }
    50% { transform: translateY(-8px) rotate(3deg); }
  }
  html.theme-90s h1 {
    font-family: "Creepster", Impact, sans-serif;
    font-size: 48px;
    color: #ff1a1a;
    text-shadow: 0 0 10px #ff0000, 3px 3px 0 #000;
    margin: 10px 0;
    letter-spacing: 2px;
  }
  html.theme-90s p {
    font-family: "VT323", monospace;
    font-size: 22px;
    color: #ffd700;
    line-height: 1.5;
  }
  html.theme-90s a {
    display: inline-block;
    margin-top: 20px;
    padding: 10px 22px;
    background: linear-gradient(180deg, #ff3300, #660000);
    color: #ffd700;
    font-family: Impact, sans-serif;
    font-size: 22px;
    text-decoration: none;
    border: 3px outset #ffd700;
    letter-spacing: 2px;
  }
  html.theme-90s a:hover { background: linear-gradient(180deg, #ffaa00, #ff3300); }
  html.theme-90s a:active { border-style: inset; }
  html.theme-90s .marquee {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #8b0000;
    color: #ffd700;
    font-family: "Press Start 2P", monospace;
    font-size: 10px;
    padding: 6px 0;
    border-top: 3px ridge #ffd700;
  }

  /* ============================================================
     THEME: MODERN — sleek confessional
     ============================================================ */
  html.theme-modern body {
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    background: radial-gradient(ellipse at 50% 30%, #1a0e0f 0%, #0a0608 45%, #050306 100%);
    color: #e8e0d8;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
    position: relative;
  }
  html.theme-modern body::before {
    content: "";
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at top, rgba(185, 28, 60, 0.08), transparent 55%);
    pointer-events: none;
    z-index: 0;
  }
  html.theme-modern .box {
    position: relative;
    z-index: 1;
    background: transparent;
    border: none;
    padding: 0;
    max-width: 480px;
    box-shadow: none;
  }
  html.theme-modern .emoji {
    font-size: 56px;
    animation: none;
    opacity: 0.85;
    margin-bottom: 8px;
  }
  html.theme-modern h1 {
    font-family: "Cormorant Garamond", serif;
    font-weight: 400;
    font-size: clamp(40px, 6vw, 56px);
    letter-spacing: 0.04em;
    color: #f5ebe0;
    margin: 8px 0 0;
    text-shadow: none;
    line-height: 1.05;
    text-transform: none;
  }
  html.theme-modern h1::after {
    content: "";
    display: block;
    width: 40px;
    height: 1px;
    background: rgba(185, 28, 60, 0.6);
    margin: 24px auto 0;
  }
  html.theme-modern p {
    font-family: "Inter", sans-serif;
    font-weight: 300;
    font-size: 15px;
    color: #b8a895;
    line-height: 1.7;
    margin: 24px 0 0;
  }
  html.theme-modern p span {
    color: #5a4a42 !important;
    font-family: "Cormorant Garamond", serif;
    font-style: italic;
    font-size: 14px !important;
  }
  html.theme-modern a {
    display: inline-block;
    margin-top: 40px;
    padding: 12px 28px;
    background: transparent;
    color: #e8dfd5;
    font-family: "Inter", sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    text-decoration: none;
    border: 1px solid rgba(185, 28, 60, 0.6);
    border-radius: 2px;
    transition: all 0.3s ease;
  }
  html.theme-modern a:hover {
    background: rgba(185, 28, 60, 0.12);
    border-color: rgba(185, 28, 60, 1);
    color: #fff;
  }
  html.theme-modern .marquee { display: none; }

  /* ============================================================
     THEME: AGENT — terminal / structured output
     ============================================================ */
  html.theme-agent body {
    font-family: "SF Mono", Menlo, "Courier New", monospace;
    background: #0b0c0d;
    color: #c7d1d9;
    line-height: 1.6;
    padding: 48px 24px;
    display: block;
  }
  html.theme-agent .box {
    max-width: 720px;
    margin: 0 auto;
    background: transparent;
    border: none;
    padding: 0;
    box-shadow: none;
    text-align: left;
  }
  html.theme-agent .emoji { display: none; }
  html.theme-agent h1 {
    font-family: "SF Mono", Menlo, monospace;
    font-size: 18px;
    font-weight: 500;
    color: #e8eef3;
    margin: 0 0 16px;
    letter-spacing: 0;
    text-transform: none;
    text-shadow: none;
  }
  html.theme-agent h1::before {
    content: "> ";
    color: #4d7c0f;
  }
  html.theme-agent p {
    font-family: "SF Mono", Menlo, monospace;
    font-size: 13px;
    color: #a1adb8;
    margin: 12px 0;
    line-height: 1.6;
    text-align: left;
  }
  html.theme-agent p span {
    color: #4a5560 !important;
    font-size: 12px !important;
    font-family: "SF Mono", Menlo, monospace !important;
  }
  html.theme-agent a {
    display: inline-block;
    margin-top: 32px;
    padding: 6px 12px;
    background: #13161a;
    color: #7dd3fc;
    font-family: "SF Mono", Menlo, monospace;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    text-decoration: none;
    border: 1px solid #1f242a;
    border-radius: 3px;
  }
  html.theme-agent a:hover { background: #1a1f24; color: #bae6fd; }
  html.theme-agent .marquee { display: none; }
</style>
</head>
<body>
  <div class="box">
    <div class="emoji">${emoji}</div>
    <h1>${heading}</h1>
    <div>${body}</div>
    <a href="/">← BACK TO THE BOOTH</a>
  </div>
  <div class="marquee"><marquee scrollamount="5">⛧ YOUR PRESENCE IS LOGGED BY THE MACHINE ⛧ BUT NOT BY THE WEBMASTER ⛧ PROBABLY ⛧</marquee></div>
</body>
</html>`;

export function successHTML(): string {
  return resultLayout(
    "Sin Received",
    "ABSOLVED",
    `<p>Your confession has been recorded.<br>
     Penance: ship better evals.<br><br>
     <span style="font-size:16px; color:#aaa;">go in peace, builder.</span></p>`,
    "🙏",
  );
}

export function errorHTML(message: string): string {
  return resultLayout(
    "Confession Rejected",
    "REJECTED",
    `<p>${escapeHTML(message)}</p>`,
    "⛧",
  );
}

export function rateLimitHTML(): string {
  return resultLayout(
    "Slow Down, Sinner",
    "TOO FAST",
    `<p>You've already confessed recently.<br>
     Reflect on what you've done.<br><br>
     <span style="font-size:16px; color:#aaa;">try again in 15 minutes.</span></p>`,
    "⏳",
  );
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
