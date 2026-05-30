import { existsSync, mkdirSync } from "node:fs";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const DEFAULT_BASE_URL = "https://nucboxg3-win.tail2f559.ts.net:8443";
const baseUrl = (process.env.PREVIEW_URL ?? process.argv[2] ?? DEFAULT_BASE_URL).replace(/\/$/, "");
const outputDir = resolve(process.env.PREVIEW_OUT ?? "/private/tmp/news-preview-smoke");

const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

async function checkHttp(path, validate) {
  const url = `${baseUrl}${path}`;
  const started = Date.now();
  const res = await fetch(url, { cache: "no-store" });
  const elapsed = Date.now() - started;
  const body = await res.text();

  if (!res.ok) {
    fail(`${path} returned HTTP ${res.status}`);
    return null;
  }

  const details = await validate(body, res);
  console.log(`PASS ${path} ${res.status} ${elapsed}ms${details ? ` ${details}` : ""}`);
  return body;
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

function runChrome(chrome, name, viewport) {
  const file = resolve(outputDir, `${name}.png`);
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=8000",
    `--window-size=${viewport}`,
    `--screenshot=${file}`,
    `${baseUrl}/`,
  ];

  return new Promise((resolvePromise) => {
    const child = spawn(chrome, args, { stdio: "pipe" });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0 && existsSync(file)) {
        console.log(`PASS screenshot ${name} ${file}`);
      } else {
        fail(`screenshot ${name} failed${stderr ? `: ${stderr.trim()}` : ""}`);
      }
      resolvePromise();
    });
  });
}

await checkHttp("/", async (body) => {
  if (!body.includes("Newsfeed")) {
    fail("homepage HTML does not include Newsfeed");
  }
  if (!body.includes("繁中科技")) {
    fail("homepage HTML does not include expected Traditional Chinese shell copy");
  }
  return `bytes=${Buffer.byteLength(body)}`;
});

for (const category of ["tech", "stock", "world"]) {
  await checkHttp(`/api/news?category=${category}`, async (body) => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      fail(`${category} API returned non-JSON response`);
      return "";
    }

    if (payload.category !== category) {
      fail(`${category} API category mismatch: ${payload.category}`);
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      fail(`${category} API returned no items`);
      return "";
    }

    const first = payload.items[0];
    for (const key of ["title", "link", "source", "pubDate"]) {
      if (!first[key]) {
        fail(`${category} first item missing ${key}`);
      }
    }

    return `count=${payload.items.length} first="${String(first.title).slice(0, 36)}"`;
  });
}

mkdirSync(outputDir, { recursive: true });
const chrome = await findChrome();
if (!chrome) {
  fail("Chrome/Chromium not found; HTTP/API preview checks ran, screenshots skipped");
} else {
  await runChrome(chrome, "desktop", "1440,1000");
  await runChrome(chrome, "mobile", "390,844");
}
