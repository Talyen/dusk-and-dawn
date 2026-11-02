import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

it("serializes a clean fast-forward and refuses a dirty main", () => {
  const temp = mkdtempSync(join(tmpdir(), "dusk-integration-"));
  const main = join(temp, "main"),
    task = join(temp, "task"),
    script = resolve("scripts/integrate.mjs");
  const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  try {
    execFileSync("git", ["init", "-b", "main", main]);
    git(main, "config", "user.name", "Test");
    git(main, "config", "user.email", "test@example.invalid");
    git(main, "config", "commit.gpgsign", "false");
    git(main, "commit", "--allow-empty", "-m", "base");
    git(main, "worktree", "add", "-b", "task", task);
    writeFileSync(join(task, "new.txt"), "task");
    git(task, "add", "new.txt");
    git(task, "commit", "-m", "task");
    const verified = git(task, "rev-parse", "HEAD");
    writeFileSync(join(main, "untracked.txt"), "do not overwrite");
    expect(() =>
      execFileSync(process.execPath, [script, main, verified], { cwd: task, stdio: "pipe" }),
    ).toThrow();
    expect(git(main, "rev-parse", "HEAD")).not.toBe(verified);
    rmSync(join(main, "untracked.txt"));
    execFileSync(process.execPath, [script, main, verified], { cwd: task, stdio: "pipe" });
    expect(git(main, "rev-parse", "HEAD")).toBe(verified);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
