import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const manifestPath = resolve(root, "assets/manifest.json");
const receiptPath = resolve(root, "assets/receipt.json");
const outputRoot = resolve(root, "public/assets");
const hash = (data) => createHash("sha256").update(data).digest("hex");
const entries = JSON.parse(await readFile(manifestPath, "utf8"));
if (!Array.isArray(entries)) throw new Error("Asset manifest must be an array");
const names = new Set();
for (const entry of entries) {
  if (
    !entry ||
    typeof entry.source !== "string" ||
    isAbsolute(entry.source) ||
    entry.source.split(/[\\/]/).includes("..") ||
    typeof entry.output !== "string" ||
    !/^[a-z0-9][a-z0-9._-]*\.webp$/.test(entry.output) ||
    !Number.isInteger(entry.width) ||
    entry.width < 1 ||
    entry.width > 4096 ||
    !Number.isInteger(entry.quality) ||
    entry.quality < 1 ||
    entry.quality > 100 ||
    names.has(entry.output)
  ) {
    throw new Error("Invalid or duplicate asset manifest entry");
  }
  names.add(entry.output);
}
const manifestHash = hash(JSON.stringify(entries));
if (process.argv[2] === "--check") {
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  if (
    receipt.version !== 1 ||
    receipt.manifestHash !== manifestHash ||
    !Array.isArray(receipt.outputs) ||
    receipt.outputs.length !== entries.length
  )
    throw new Error("Asset receipt is stale");
  for (const [index, entry] of entries.entries()) {
    const item = receipt.outputs[index];
    if (
      item?.output !== entry.output ||
      item?.hash !== hash(await readFile(resolve(outputRoot, entry.output)))
    )
      throw new Error(`Asset output is missing or changed: ${entry.output}`);
  }
  console.log(`Checked ${entries.length} prepared assets`);
} else if (process.argv[2] === "--prepare") {
  if (entries.length && !process.env.ASSET_LIBRARY_ROOT)
    throw new Error("Set ASSET_LIBRARY_ROOT to the source library");
  const library = entries.length ? await realpath(process.env.ASSET_LIBRARY_ROOT) : "";
  const prepared = [];
  for (const entry of entries) {
    const source = await realpath(resolve(library, entry.source));
    const inside = relative(library, source);
    if (!inside || inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside))
      throw new Error("Asset source escapes its library");
    const input = await readFile(source);
    const output = await sharp(input)
      .resize({ width: entry.width, withoutEnlargement: true })
      .webp({ quality: entry.quality })
      .toBuffer();
    prepared.push({ output: entry.output, sourceHash: hash(input), hash: hash(output), data: output });
  }
  await mkdir(outputRoot, { recursive: true });
  for (const item of prepared) {
    const target = resolve(outputRoot, item.output),
      temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, item.data, { flag: "wx" });
    await rename(temporary, target);
  }
  const receipt = {
    version: 1,
    manifestHash,
    outputs: prepared.map(({ output, sourceHash, hash: outputHash }) => ({
      output,
      sourceHash,
      hash: outputHash,
    })),
  };
  const temporary = `${receiptPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  await rename(temporary, receiptPath);
  console.log(`Prepared ${prepared.length} assets`);
} else throw new Error("Use --prepare or --check");
