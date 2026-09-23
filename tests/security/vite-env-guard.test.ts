import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

/** Secret-indicating keyword pattern (matches CI guard in ci.yml) */
const ENV_SECRET_PATTERN = /VITE_.*(SECRET|KEY|TOKEN|PASSWORD)/i;
const SOURCE_SECRET_PATTERN =
  /import\.meta\.env\.VITE_.*(SECRET|KEY|TOKEN|PASSWORD)/i;

/** Recursively collect all .ts/.tsx files under a directory */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(tsx?)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

describe("VITE_ secret guard (regression #287)", () => {
  const root = resolve(__dirname, "../..");

  it("no VITE_ secret variables in .env.example", () => {
    const envExample = readFileSync(join(root, ".env.example"), "utf-8");
    const lines = envExample.split("\n");
    const violations = lines.filter(
      (line) => !line.trimStart().startsWith("#") && ENV_SECRET_PATTERN.test(line),
    );
    expect(
      violations,
      `Found VITE_ secret variable(s) in .env.example:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });

  it("no import.meta.env.VITE_ secret references in source code", () => {
    const srcDir = join(root, "src");
    const files = collectSourceFiles(srcDir);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (SOURCE_SECRET_PATTERN.test(lines[i]!)) {
          violations.push(`${file}:${i + 1}: ${lines[i]!.trim()}`);
        }
      }
    }

    expect(
      violations,
      `Source code references VITE_ secret variable(s):\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });
});
