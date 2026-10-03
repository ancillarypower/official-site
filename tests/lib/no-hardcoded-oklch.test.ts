import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join, relative } from "path";

/** Tailwind arbitrary-value class containing a raw oklch() color, e.g. bg-[oklch(55%_0.15_25)] */
const HARDCODED_OKLCH_CLASS = /\[oklch\(/;

/** Semantic tokens extracted in #581; values live only in src/index.css @theme */
const REQUIRED_TOKENS = [
  "--color-danger-action",
  "--color-danger-action-hover",
  "--color-danger-border",
  "--color-danger-subtle",
  "--color-danger-text",
  "--color-viewer-bg",
  "--color-viewer-text",
  "--color-viewer-error",
  "--color-success-subtle",
  "--color-success-strong",
];

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

describe("design tokens (regression #581)", () => {
  const root = resolve(__dirname, "../..");
  const srcDir = join(root, "src");

  it("no source file uses hardcoded oklch() arbitrary-value classes", () => {
    const violations: string[] = [];

    for (const file of collectSourceFiles(srcDir)) {
      const lines = readFileSync(file, "utf-8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (HARDCODED_OKLCH_CLASS.test(lines[i]!)) {
          violations.push(`${relative(root, file)}:${i + 1}: ${lines[i]!.trim()}`);
        }
      }
    }

    expect(
      violations,
      `Hardcoded oklch() classes found; use a semantic token from src/index.css instead:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });

  it("index.css @theme defines every extracted semantic token", () => {
    const css = readFileSync(join(srcDir, "index.css"), "utf-8");
    const themeBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    const missing = REQUIRED_TOKENS.filter((token) => !themeBlock.includes(`${token}:`));
    expect(missing, `Missing @theme tokens: ${missing.join(", ")}`).toHaveLength(0);
  });
});
