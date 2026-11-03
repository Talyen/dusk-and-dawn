import { readFile, writeFile } from "node:fs/promises";
const cards = JSON.parse(await readFile("docs/Dusk & Dawn — Card Effect Catalogue v0.2.json", "utf8"));
const enemies = JSON.parse(
  await readFile("docs/Dusk & Dawn — Enemy Mechanics Catalogue v0.1.json", "utf8"),
).enemies;
const data = {
  cards: cards.map(({ pair, side }) => ({ pair, side })),
  enemies: enemies.map(({ id, keywords }) => ({ id, keywords })),
};
await writeFile(
  "src/lib/collection/index.generated.ts",
  `// Generated from the reviewed catalogues by scripts/generate-collection-index.mjs.\nexport const collectionIndex = ${JSON.stringify(data, null, 2)} as const;\n`,
);
