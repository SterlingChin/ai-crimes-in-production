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
<style>
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=Creepster&family=Press+Start+2P&display=swap');
  body {
    margin: 0;
    min-height: 100vh;
    background: #000 radial-gradient(circle at center, #330000 0%, #000 70%);
    color: #fff;
    font-family: "Comic Sans MS", cursive;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;
  }
  .box {
    border: 6px double #ffd700;
    padding: 40px 30px;
    max-width: 520px;
    background: linear-gradient(180deg, #1a0000, #330000);
    box-shadow: 0 0 50px rgba(255,0,0,0.5);
  }
  .emoji {
    font-size: 80px;
    animation: bob 1.5s ease-in-out infinite;
  }
  @keyframes bob {
    0%, 100% { transform: translateY(0) rotate(-3deg); }
    50% { transform: translateY(-8px) rotate(3deg); }
  }
  h1 {
    font-family: "Creepster", Impact, sans-serif;
    font-size: 48px;
    color: #ff1a1a;
    text-shadow: 0 0 10px #ff0000, 3px 3px 0 #000;
    margin: 10px 0;
    letter-spacing: 2px;
  }
  p {
    font-family: "VT323", monospace;
    font-size: 22px;
    color: #ffd700;
    line-height: 1.5;
  }
  a {
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
  a:hover { background: linear-gradient(180deg, #ffaa00, #ff3300); }
  a:active { border-style: inset; }
  .marquee {
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
