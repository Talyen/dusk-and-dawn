import { execFileSync } from "node:child_process";
import { mkdirSync, realpathSync, rmdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const [mainPath, verifiedCommit] = process.argv.slice(2);
if (!mainPath || !/^[0-9a-f]{40}$/.test(verifiedCommit ?? "")) {
  throw new Error("Usage: node scripts/integrate.mjs <main-worktree> <verified-full-commit>");
}
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const task = process.cwd();
const main = realpathSync.native(mainPath);
const common = (cwd) => realpathSync.native(resolve(cwd, git(cwd, "rev-parse", "--git-common-dir")));
const taskCommon = common(task);
const mainCommon = common(main);
const taskStat = statSync(taskCommon, { bigint: true });
const mainStat = statSync(mainCommon, { bigint: true });
const samePath =
  process.platform === "win32"
    ? taskCommon.toLowerCase() === mainCommon.toLowerCase()
    : taskCommon === mainCommon;
const sameIdentity = taskStat.ino !== 0n && taskStat.dev === mainStat.dev && taskStat.ino === mainStat.ino;
if (!samePath && !sameIdentity) throw new Error("Worktrees do not share a Git repository");
const lock = resolve(taskCommon, "dusk-integration.lock");
const deadline = Date.now() + 30_000;
while (true) {
  try {
    mkdirSync(lock);
    break;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (Date.now() >= deadline) throw new Error(`Integration lock is busy: ${lock}`);
    await new Promise((done) => setTimeout(done, 250));
  }
}
try {
  if (git(main, "branch", "--show-current") !== "main")
    throw new Error("Main worktree must have main checked out");
  if (git(main, "status", "--porcelain") || git(task, "status", "--porcelain")) {
    throw new Error("Both worktrees must be clean, including untracked files");
  }
  if (git(task, "rev-parse", "HEAD") !== verifiedCommit)
    throw new Error("Task HEAD differs from verified commit");
  const mainCommit = git(main, "rev-parse", "HEAD");
  try {
    git(task, "merge-base", "--is-ancestor", mainCommit, verifiedCommit);
  } catch {
    throw new Error("Task commit does not include current main; incorporate it and reverify first");
  }
  execFileSync("git", ["merge", "--ff-only", verifiedCommit], { cwd: main, stdio: "inherit" });
} finally {
  rmdirSync(lock);
}
