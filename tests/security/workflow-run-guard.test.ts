import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";

/**
 * Guards for privileged workflow_run workflows (regression #607, #600).
 *
 * `on.workflow_run.branches` matches the branch name of the triggering CI
 * run, so a fork PR opened from the fork's own `main` also matches. Every
 * workflow_run workflow must therefore check, at the first job, that the
 * triggering run was a push to this repository.
 *
 * There is no YAML parser in the dependency tree, so these checks work on
 * the raw text, scoped to the first job's header (everything between
 * `jobs:` and the first `steps:`).
 */

const root = resolve(__dirname, "../..");
const workflowDir = join(root, ".github", "workflows");

const EVENT_GUARD = "github.event.workflow_run.event == 'push'";
const REPO_GUARD = "github.event.workflow_run.head_repository.full_name == github.repository";
const SUCCESS_GUARD = "github.event.workflow_run.conclusion == 'success'";
const DISPATCH_ALLOWED = "github.event_name == 'workflow_dispatch'";

function readWorkflow(name: string): string {
  return readFileSync(join(workflowDir, name), "utf-8");
}

function workflowRunFiles(): string[] {
  return readdirSync(workflowDir)
    .filter((f) => /\.ya?ml$/.test(f))
    .filter((f) => /^\s*workflow_run:/m.test(readWorkflow(f)));
}

/** Text of the first job's header: from `jobs:` up to its first `steps:`. */
function firstJobHeader(src: string): string {
  const jobsAt = src.search(/^jobs:\s*$/m);
  if (jobsAt < 0) return "";
  const rest = src.slice(jobsAt);
  const stepsAt = rest.indexOf("steps:");
  return stepsAt < 0 ? rest : rest.slice(0, stepsAt);
}

describe("workflow_run guards (regression #607)", () => {
  const files = workflowRunFiles();

  it("finds the privileged workflow_run workflows", () => {
    expect(files).toEqual(expect.arrayContaining(["deploy.yml", "coverage-badge.yml"]));
  });

  it.each(files)("%s only runs for pushes, not pull_request runs", (file) => {
    expect(firstJobHeader(readWorkflow(file))).toContain(EVENT_GUARD);
  });

  it.each(files)("%s only runs for CI runs from this repository, not forks", (file) => {
    expect(firstJobHeader(readWorkflow(file))).toContain(REPO_GUARD);
  });

  it.each(files)("%s still requires CI success and still allows manual dispatch", (file) => {
    const header = firstJobHeader(readWorkflow(file));
    expect(header).toContain(SUCCESS_GUARD);
    expect(header).toContain(DISPATCH_ALLOWED);
  });
});

describe("deploy checks out the commit CI verified (regression #600)", () => {
  it("deploy.yml checkout pins ref to workflow_run.head_sha", () => {
    const src = readWorkflow("deploy.yml");
    expect(src).toMatch(
      /actions\/checkout@\S+[^\n]*\n\s+with:\s*\n\s+ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha \|\| github\.sha\s*\}\}/,
    );
  });
});
