import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3000";
const devDistDir = ".next-dev";

async function start() {
  // Fresh dev output on each run to avoid stale chunk references.
  await rm(devDistDir, { recursive: true, force: true });

  const child = spawn(
    process.execPath,
    ["./node_modules/next/dist/bin/next", "dev", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    }
  );

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
}

start().catch((error) => {
  console.error("[dev-stable] Failed to start dev server", error);
  process.exit(1);
});


