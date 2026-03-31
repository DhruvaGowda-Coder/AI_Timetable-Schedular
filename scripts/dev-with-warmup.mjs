import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3000";
const baseUrl = `http://localhost:${port}`;
const devDistDir = ".next-dev";
const warmRoutes = [
  "/",
  "/login",
  "/dashboard",
  "/scheduler",
  "/analytics",
  "/notifications",
  "/billing",
  "/profile",
  "/api/dashboard",
  "/api/analytics",
  "/api/billing",
  "/api/notifications",
];

let warmed = false;

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function warmUpRoutes() {
  console.log("[dev-warmup] Warming key routes to reduce first navigation delay...");
  for (const route of warmRoutes) {
    const url = `${baseUrl}${route}`;
    try {
      const response = await fetchWithTimeout(url);
      console.log(`[dev-warmup] ${route} -> ${response.status}`);
    } catch {
      console.log(`[dev-warmup] ${route} -> failed`);
    }
  }
  console.log("[dev-warmup] Warm-up complete.");
}

async function start() {
  // Ensure a fresh dev build to avoid stale RSC manifest/chunk issues on Windows.
  await rm(devDistDir, { recursive: true, force: true });

  const child = spawn(
    process.execPath,
    ["./node_modules/next/dist/bin/next", "dev", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    }
  );

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    if (!warmed && /Ready in/i.test(text)) {
      warmed = true;
      void warmUpRoutes();
    }
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk.toString());
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }
}

start().catch((error) => {
  console.error("[dev-warmup] Failed to start dev server", error);
  process.exit(1);
});


