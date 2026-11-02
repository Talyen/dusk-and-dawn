const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const MAX_BYTES = 1024 * 1024;

function validJson(root) {
  const pending = [root];
  while (pending.length) {
    const value = pending.pop();
    if (value === null || typeof value === "string" || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return false;
      continue;
    }
    if (typeof value !== "object") return false;
    for (const item of Object.values(value)) pending.push(item);
  }
  return true;
}
function validEnvelope(data) {
  if (typeof data !== "string" || Buffer.byteLength(data, "utf8") > MAX_BYTES) return false;
  try {
    const value = JSON.parse(data);
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join(",") === "random,revision,state,version" &&
      value.version === 1 &&
      Number.isSafeInteger(value.revision) &&
      value.revision >= 0 &&
      Number.isInteger(value.random) &&
      value.random >= 0 &&
      value.random <= 0xffffffff &&
      validJson(value.state)
    );
  } catch {
    return false;
  }
}
function createSaveStorage(directory) {
  const primary = path.join(directory, "save.json");
  const backup = path.join(directory, "save.backup.json");
  let pending = Promise.resolve();
  async function readFile(file) {
    try {
      const stat = await fs.stat(file);
      if (!stat.isFile() || stat.size > MAX_BYTES) return null;
      return await fs.readFile(file, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }
  async function atomicWrite(file, data) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, data, { encoding: "utf8", flag: "wx" });
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
  return {
    async readCandidates() {
      await pending;
      return (await Promise.all([readFile(primary), readFile(backup)])).filter((value) => value !== null);
    },
    write(data) {
      if (!validEnvelope(data)) return Promise.reject(new Error("Invalid save envelope"));
      const write = pending.then(async () => {
        await fs.mkdir(directory, { recursive: true });
        const previous = await readFile(primary);
        if (previous && validEnvelope(previous)) await atomicWrite(backup, previous);
        await atomicWrite(primary, data);
      });
      pending = write.catch(() => {});
      return write;
    },
  };
}
module.exports = { createSaveStorage };
