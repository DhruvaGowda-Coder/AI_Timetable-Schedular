import { rm } from "node:fs/promises";

const generatedPaths = [".next", ".next-dev", "tsconfig.tsbuildinfo"];

async function run() {
  for (const target of generatedPaths) {
    try {
      await rm(target, { recursive: true, force: true });
      console.log(`[clean] removed ${target}`);
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      console.warn(
        `[clean] skipped ${target}${code ? ` (${code})` : ""}`
      );
    }
  }
}

run().catch((error) => {
  console.error("[clean] failed", error);
  process.exit(1);
});


