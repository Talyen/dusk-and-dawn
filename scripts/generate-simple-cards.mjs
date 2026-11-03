import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const catalog = JSON.parse(await readFile("docs/Dusk & Dawn — Card Effect Catalogue v0.2.json", "utf8"));
const art = JSON.parse(await readFile("docs/Card Artwork Coverage v0.1.json", "utf8")).artwork_inventory;
const manifest = JSON.parse(await readFile("assets/manifest.json", "utf8"));
const sourceRoot = process.env.ASSET_LIBRARY_ROOT;
if (!sourceRoot) throw new Error("Set ASSET_LIBRARY_ROOT to the project artwork library");
const parse = (effect) => {
  const result = [];
  const sentences = effect.match(/[^.]+\./g) ?? [];
  if (sentences.map((value) => value.trim()).join(" ") !== effect) return null;
  for (const raw of sentences) {
    const text = raw.trim();
    let match;
    if (text === "Banish this card.") result.push({ op: "banish" });
    else if ((match = /^Draw (\d+) cards?\.$/.exec(text))) result.push({ op: "draw", amount: +match[1] });
    else if ((match = /^(Curse|Bless) (\d+)\.$/.exec(text)))
      result.push({ op: match[1].toLowerCase(), amount: +match[2] });
    else if ((match = /^Heal (\d+) HP\.$/.exec(text))) result.push({ op: "heal", amount: +match[1] });
    else if ((match = /^Gain (\d+) (Ward|mana)\.$/.exec(text)))
      result.push({ op: match[2].toLowerCase(), amount: +match[1] });
    else if ((match = /^Apply (\d+) (Burn|Poison)\.$/.exec(text)))
      result.push({ op: match[2].toLowerCase(), amount: +match[1] });
    else if (
      (match =
        /^Deal (\d+) (Radiance|Shadow|Growth|Decay|Binding|Release|Fire|Frost|Memory|Oblivion) damage(?: (twice|three times))?\.$/.exec(
          text,
        ))
    )
      result.push({
        op: "attack",
        amount: +match[1],
        type: match[2],
        hits: match[3] === "twice" ? 2 : match[3] === "three times" ? 3 : 1,
        leech: false,
      });
    else if (text === "Leech." && result.at(-1)?.op === "attack") result.at(-1).leech = true;
    else if ((match = /^Banish the (top|bottom) card of your discard pile\.$/.exec(text)))
      result.push({ op: "banish-discard", position: match[1] });
    else if ((match = /^Return the (top|bottom) card of your discard pile to your hand\.$/.exec(text)))
      result.push({ op: "return-discard", position: match[1] });
    else if (text === "Flip a random card in your hand.") result.push({ op: "flip-random", count: 1 });
    else if ((match = /^Flip (\d+) random cards in your hand\.$/.exec(text)))
      result.push({ op: "flip-random", count: +match[1] });
    else if (text === "Flip this card.") result.push({ op: "flip-self" });
    else if (text === "Discard a random card.") result.push({ op: "discard-random" });
    else if (text === "Keep a random card in your hand.") result.push({ op: "keep-random", count: 1 });
    else if ((match = /^Keep (\d+) random cards in your hand\.$/.exec(text)))
      result.push({ op: "keep-random", count: +match[1] });
    else if ((match = /^Remove all your (Burn|Poison|Curse)\.$/.exec(text)))
      result.push({ op: "remove-status", status: match[1].toLowerCase() });
    else if (text === "Remove all Burn from both combatants.") result.push({ op: "remove-burn-both" });
    else if (text === "Cleanse all harmful statuses from yourself.") result.push({ op: "cleanse-all" });
    else if (text === "Cleanse one random harmful status from yourself.") result.push({ op: "cleanse-one" });
    else if (text === "Purge all beneficial statuses from the enemy.") result.push({ op: "purge-all" });
    else if (text === "Purge one random beneficial status from the enemy.") result.push({ op: "purge-one" });
    else if ((match = /^Lose (\d+) HP\.$/.exec(text))) result.push({ op: "lose-hp", amount: +match[1] });
    else if ((match = /^Remove (\d+) enemy Ward\.$/.exec(text)))
      result.push({ op: "remove-ward", amount: +match[1] });
    else if (text === "Hush.") result.push({ op: "hush" });
    else if (text === "Freeze.") result.push({ op: "freeze" });
    else if (text === "Scry.") result.push({ op: "scry" });
    else if (text === "Flip your hand.") result.push({ op: "flip-hand" });
    else if (text === "Keep your hand.") result.push({ op: "keep-hand" });
    else if (text === "Keep this card.") result.push({ op: "keep-self" });
    else if (text === "Reflect the first hit of the enemy's next attack.") result.push({ op: "reflect" });
    else if ((match = /^Turn your hand to its (light|dark) faces\.$/.exec(text)))
      result.push({ op: "turn-hand", face: match[1] });
    else return null;
  }
  return result.length ? result : null;
};
const pairs = new Map();
for (const entry of catalog) {
  const list = pairs.get(entry.pair) ?? [];
  list.push(entry);
  pairs.set(entry.pair, list);
}
const extra = {};
const existing = new Set(manifest.map((x) => x.output));
for (const [pair, entries] of pairs) {
  if (entries.length !== 2 || !entries.every((entry) => parse(entry.effect))) continue;
  const faces = {};
  for (const entry of entries) {
    const record = art.find((item) => item.face === entry.face);
    if (!record) throw new Error(`Missing artwork record for ${entry.face}`);
    const input = await readFile(join(sourceRoot, "Artwork", record.file));
    const hash = createHash("sha256").update(input).digest("hex");
    if (hash !== record.sha256) throw new Error(`Artwork hash mismatch for ${entry.face}`);
    const output = `card-${entry.face
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.webp`;
    const prior = manifest.find((item) => item.output === output);
    if (prior && prior.source !== `Artwork/${record.file}`)
      throw new Error(`Artwork filename collision for ${entry.face}`);
    if (!existing.has(output)) {
      manifest.push({ source: `Artwork/${record.file}`, output, width: 512, quality: 82 });
      existing.add(output);
    }
    faces[entry.side] = {
      name: entry.face,
      effect: entry.effect,
      keywords: entry.keywords,
      ops: parse(entry.effect),
    };
  }
  if (!faces.light || !faces.dark) throw new Error(`Incomplete sides for ${pair}`);
  extra[pair] = faces;
}
await writeFile(
  "src/lib/game/simple-cards.generated.ts",
  `// Generated from the reviewed catalogue by scripts/generate-simple-cards.mjs.\nexport const simpleCards = ${JSON.stringify(extra, null, 2)} as const;\n`,
);
await writeFile("assets/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Generated ${Object.keys(extra).length} supported pairs; ${manifest.length} prepared assets`);
