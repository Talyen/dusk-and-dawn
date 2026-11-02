import { readFile, readdir } from "node:fs/promises";
const dir = new URL("../src/lib/localization/locales/", import.meta.url);
const english = JSON.parse(await readFile(new URL("en.json", dir), "utf8"));
const files = (await readdir(dir)).filter((file) => file.endsWith(".json"));
const placeholders = (text) => [...text.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]).sort();
for (const file of files) {
  const catalog = JSON.parse(await readFile(new URL(file, dir), "utf8"));
  if (JSON.stringify(Object.keys(catalog).sort()) !== JSON.stringify(Object.keys(english).sort()))
    throw new Error(`${file}: message keys differ from English`);
  for (const [key, value] of Object.entries(catalog)) {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(english[key]))
    )
      throw new Error(`${file}: invalid message or placeholders for ${key}`);
  }
}
console.log(`Checked ${files.length} localization catalogs`);
