import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const catalogue = JSON.parse(
  await readFile("docs/Dusk & Dawn — Enemy Mechanics Catalogue v0.1.json", "utf8"),
).enemies;
const manifest = JSON.parse(await readFile("assets/manifest.json", "utf8"));
const sourceRoot = process.env.ASSET_LIBRARY_ROOT;
if (!sourceRoot) throw new Error("Set ASSET_LIBRARY_ROOT to the artwork library");
const baseAllowed = new Set(["damage", "ward", "curse", "heal", "bless", "move_top", "turn_after_draw"]);
const traitsAllowed = new Set([
  "bonus_damage",
  "extra_hits",
  "curse",
  "poison",
  "burn",
  "heal",
  "ward",
  "bless",
  "remove_burn",
  "remove_poison",
  "ignore_ward",
  "move_top",
  "flip_held",
  "move_held",
  "recover_to_top",
  "remove_ward",
  "reduce_next_draw",
  "turn_after_draw",
  "reflect_once",
  "turn_held",
  "copy_latest_hit",
  "reduce_next_mana",
  "leech",
  "reaction_damage",
]);
const result = [];
for (const enemy of catalogue) {
  if (
    Object.values(enemy.trait.conditions_by_action).some(
      (condition) => condition !== "enemy_has_Burn_after_tick",
    ) ||
    !enemy.actions.every(
      (action) =>
        action.base.length === 1 &&
        action.base.every((op) => baseAllowed.has(op.op)) &&
        (enemy.trait.by_action[action.id] ?? []).every((op) => traitsAllowed.has(op.op)),
    )
  )
    continue;
  const input = await readFile(join(sourceRoot, "Enemy Artwork", enemy.artwork.source_filename));
  if (createHash("sha256").update(input).digest("hex") !== enemy.artwork.sha256)
    throw new Error(`Artwork hash mismatch: ${enemy.name}`);
  const output = `enemy-${enemy.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.webp`;
  const source = `Enemy Artwork/${enemy.artwork.source_filename}`;
  const prior = manifest.find((entry) => entry.output === output);
  if (prior && prior.source !== source) throw new Error(`Artwork filename collision: ${enemy.name}`);
  if (!prior) manifest.push({ source, output, width: 640, quality: 82 });
  const actions = enemy.pattern.map((id) => {
    const action = enemy.actions.find((item) => item.id === id);
    const base = action.base[0];
    const traits = enemy.trait.by_action[id] ?? [];
    const hit = base.op === "damage" ? base.amount : undefined;
    const bonus = traits.find((op) => op.op === "bonus_damage");
    const extra = traits
      .filter((op) => op.op === "extra_hits")
      .flatMap((op) => Array(op.count).fill(op.amount));
    if (
      (bonus && bonus.damage_type !== base.damage_type) ||
      traits.some((op) => op.op === "extra_hits" && op.damage_type !== base.damage_type)
    )
      throw new Error(`Mixed attack types: ${enemy.name}`);
    return {
      name: action.name,
      text: action.preview,
      ...(hit !== undefined
        ? { hit, type: base.damage_type }
        : {
            ability: base.op,
            ...(typeof base.amount === "number" ? { abilityAmount: base.amount } : {}),
            baseEffect: base,
          }),
      ...(bonus ? { traitBonus: bonus.amount } : {}),
      ...(extra.length ? { extraHits: extra } : {}),
      ...(enemy.trait.conditions_by_action[id] ? { condition: enemy.trait.conditions_by_action[id] } : {}),
      effects: traits.filter((op) => op.op !== "bonus_damage" && op.op !== "extra_hits"),
    };
  });
  result.push({
    id: enemy.id,
    name: enemy.name,
    hp: enemy.health,
    weakness: enemy.weakness.type,
    trait: enemy.trait.name,
    traitEffect: enemy.trait.effect,
    actions,
  });
}
await writeFile(
  "src/lib/game/simple-enemies.generated.ts",
  `// Generated from the reviewed enemy catalogue by scripts/generate-simple-enemies.mjs.\nexport const simpleEnemies = ${JSON.stringify(result, null, 2)} as const;\n`,
);
await writeFile("assets/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Generated ${result.length} supported enemies; ${manifest.length} prepared assets`);
