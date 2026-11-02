import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { expect, it } from "vitest";

it("prepares approved sources and detects output drift without needing the source library", async () => {
  const temp = mkdtempSync(join(tmpdir(), "dusk-assets-"));
  const library = join(temp, "library"),
    project = join(temp, "project"),
    script = resolve("scripts/assets.mjs");
  try {
    mkdirSync(join(project, "assets"), { recursive: true });
    mkdirSync(library);
    await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } })
      .png()
      .toFile(join(library, "master.png"));
    writeFileSync(
      join(project, "assets", "manifest.json"),
      JSON.stringify([{ source: "master.png", output: "card.webp", width: 4, quality: 80 }]),
    );
    const run = (command: string) =>
      execFileSync(process.execPath, [script, command], {
        cwd: project,
        env: { ...process.env, ASSET_LIBRARY_ROOT: library },
        stdio: "pipe",
      });
    run("--prepare");
    const target = join(project, "public", "assets", "card.webp");
    const before = readFileSync(target);
    rmSync(join(library, "master.png"));
    run("--check");
    expect(() => run("--prepare")).toThrow();
    expect(readFileSync(target)).toEqual(before);
    writeFileSync(target, "changed");
    expect(() => run("--check")).toThrow();
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
