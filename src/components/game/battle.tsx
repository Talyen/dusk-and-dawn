import { useEffect, useRef, useState } from "react";
import {
  cards,
  cardRestriction,
  createRun,
  enemyAttackHits,
  face,
  route,
  type Command,
  type RunState,
} from "../../lib/game/run";
import { scryTop, type FightCard } from "../../lib/game/card-zones";
import { attackValues, type DamageType } from "../../lib/game/combat-status";
import { encodeRun, readRun, resumeRun } from "../../lib/game/run-save";
import {
  browserSaveBackend,
  desktopSaveBackend,
  type DesktopSaveBridge,
  type SaveBackend,
} from "../../lib/save/save";
import type { Snapshot } from "../../lib/game/session";
import { Button } from "../ui/controls";
import { KeywordDescription } from "../effects/shine";
import { keywordDefinitions } from "../../lib/keywords/keywords";

const labels = keywordDefinitions
  .filter((k) => !k.id.startsWith("sample-"))
  .map((k) => ({ id: k.id, label: k.id }));
function Description({ text }: { text: string }) {
  return <KeywordDescription text={text} labels={labels} />;
}

function art(kind: "card" | "enemy", name: string) {
  return `${import.meta.env.BASE_URL}assets/${kind}-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.webp`;
}

function statuses(holder: RunState["player"]) {
  const result: string[] = [];
  for (const name of ["ward", "burn", "poison", "bless", "curse"] as const)
    if (holder[name]) result.push(`${name} ${holder[name]}`);
  if (holder.reflect) result.push("Reflect");
  if (holder.hush) result.push("Hush");
  if (holder.freeze) result.push("Freeze");
  if (holder.nextDrawPenalty) result.push(`Next draw −${holder.nextDrawPenalty}`);
  if (holder.nextManaPenalty) result.push(`Next mana −${holder.nextManaPenalty}`);
  return result.join(" · ") || "None";
}
const keywordHelp: Record<string, string> = {
  Ward: "Absorbs damage; halve remaining Ward at the start of its holder's turn.",
  Burn: "At end turn, deal this much Fire damage, then halve Burn, rounding down.",
  Poison: "At end turn, deal this much Decay damage, then halve Poison, rounding down.",
  Flip: "Turn each affected card to its other face. Cards keep their face as they move.",
  Banish: "Remove this card from the fight; it returns for the next encounter.",
  Scry: "See the current top card of the library until end turn; Scry does not reshuffle.",
  Curse:
    "The next direct attack has reduced damage per stack; then all Curse is spent. This preview uses −1 per stack.",
  Keep: "A kept card stays in hand at end turn, then loses its Keep marker.",
  Reflect: "Redirect the first hit of the next attack back to its attacker, then remove Reflect.",
  Hush: "Suppress the next action's trait, or skip its non-attack ability; then remove Hush.",
  Freeze:
    "If still active at the next enemy action, skip it and remove Freeze. Early thaw rules are undecided.",
  Leech: "Heal for the attack's final damage before Ward, including overkill, up to maximum HP.",
};
const directCardAttacks: Record<string, { hits: number[]; type: DamageType }> = {
  Vampire: { hits: [4], type: "Shadow" },
  Sun: { hits: [6], type: "Radiance" },
  Wither: { hits: [7], type: "Decay" },
  Thorns: { hits: [2, 2], type: "Decay" },
  "Shattered Mirror": { hits: [2, 2], type: "Release" },
  Ash: { hits: [7], type: "Decay" },
  Oblivion: { hits: [7], type: "Oblivion" },
};

function saveBackend(): SaveBackend {
  const bridge = (window as unknown as { duskDesktop?: DesktopSaveBridge }).duskDesktop;
  if (bridge) return desktopSaveBackend(bridge);
  try {
    return browserSaveBackend(window.localStorage);
  } catch {
    return {
      readCandidates: async () => {
        throw new Error("Storage unavailable");
      },
      write: async () => {
        throw new Error("Storage unavailable");
      },
    };
  }
}

export function Battle({ onExit }: { onExit: () => void }) {
  const [backend] = useState(saveBackend);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<Snapshot<RunState> | null>(null);
  const [game, setGame] = useState<{ session: ReturnType<typeof createRun>; isNew: boolean } | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    void readRun(backend)
      .then((snapshot) => {
        if (!active) return;
        setSaved(snapshot);
        if (!snapshot) setGame({ session: createRun(Math.floor(Math.random() * 0x100000000)), isNew: true });
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setLoadError("The saved run could not be read. Starting a new run will replace it.");
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [backend]);
  if (!loaded)
    return (
      <main className="battle-screen">
        <p role="status">Loading run…</p>
      </main>
    );
  if (!game)
    return (
      <main className="battle-screen">
        <h1>Play</h1>
        {loadError && <p role="alert">{loadError}</p>}
        {saved && (
          <Button onClick={() => setGame({ session: resumeRun(saved), isNew: false })}>Continue run</Button>
        )}
        <Button
          onClick={() =>
            setGame({ session: createRun(Math.floor(Math.random() * 0x100000000)), isNew: true })
          }
        >
          Start new run
        </Button>
        <Button onClick={onExit}>Main menu</Button>
      </main>
    );
  return <BattleSession game={game.session} isNew={game.isNew} backend={backend} onExit={onExit} />;
}

function BattleSession({
  game,
  isNew,
  backend,
  onExit,
}: {
  game: ReturnType<typeof createRun>;
  isNew: boolean;
  backend: SaveBackend;
  onExit: () => void;
}) {
  const [snapshot, setSnapshot] = useState(game.getSnapshot);
  const [selected, setSelected] = useState<string | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  function persist(next: Snapshot<RunState>) {
    const encoded = encodeRun(next);
    writes.current = writes.current.catch(() => undefined).then(() => backend.write(encoded));
    void writes.current.then(() => setSaveError(false)).catch(() => setSaveError(true));
  }
  useEffect(() => {
    if (isNew) persist(game.getSnapshot());
  }, [game, isNew]);
  function exitBattle() {
    void writes.current.catch(() => undefined).then(onExit);
  }
  const s = snapshot.state;
  function dispatch(command: Command) {
    const result = game.dispatch(command);
    if (!result.decision.accepted) setError(result.decision.reason);
    else {
      setError("");
      setSelected(null);
      setTargets([]);
      setSnapshot(result.snapshot);
      persist(result.snapshot);
    }
  }
  const selectedCard = s.zones.hand.find((c) => c.id === selected);
  const selectedName = selectedCard ? face(selectedCard).name : "";
  const targetZone = selectedName === "Memory" ? s.zones.discard : [];
  const needsTarget = selectedName === "Memory" && targetZone.length > 0;
  const maxTargets = 1;
  const unavailable = selectedCard ? cardRestriction(s, selectedCard) : "";
  const canPlay = !!selectedCard && s.mana > 0 && !unavailable && (!needsTarget || targets.length === 1);
  function toggleTarget(id: string) {
    setTargets((t) =>
      t.includes(id)
        ? t.filter((x) => x !== id)
        : maxTargets === 1
          ? [id]
          : t.length < maxTargets
            ? [...t, id]
            : t,
    );
  }
  const top = scryTop(s.zones);
  const enemy = route[s.fight]!;
  const action = enemy.actions[s.action]!;
  const enemyHits =
    action.hit === undefined
      ? null
      : attackValues(enemyAttackHits(action, s.enemy.hush), s.enemy.bless, s.enemy.curse, 0, "flat-preview");
  const genericAttack = selectedCard
    ? face(selectedCard).ops?.find((op) => op.op === "attack" || op.op === "attack-ignore-ward")
    : undefined;
  const cardAttack =
    directCardAttacks[selectedName] ??
    (genericAttack
      ? {
          hits: Array(genericAttack.op === "attack" ? genericAttack.hits : 1).fill(
            genericAttack.amount,
          ) as number[],
          type: genericAttack.type,
        }
      : undefined);
  const cardHits = cardAttack
    ? attackValues(
        cardAttack.hits,
        s.player.bless,
        s.player.curse,
        cardAttack.type === enemy.weakness ? 2 : 0,
        "flat-preview",
      )
    : null;
  const opposite = selectedCard
    ? cards[selectedCard.pair]![selectedCard.face === "light" ? "dark" : "light"]
    : null;
  return (
    <main className="battle-screen" aria-labelledby="battle-title">
      <div className="battle-head">
        <div>
          <p className="battle-eyebrow">Dusk & Dawn · playable preview</p>
          <h1 id="battle-title">
            {s.phase === "battle"
              ? enemy.name
              : s.phase === "reward"
                ? "Choose a reward"
                : s.phase === "rest"
                  ? "A moment of rest"
                  : s.phase === "victory"
                    ? "Victory"
                    : "Run ended"}
          </h1>
        </div>
        {s.phase !== "battle" && <Button onClick={exitBattle}>Main menu</Button>}
      </div>
      <p className="battle-preview">
        Preview rules: Bless and Curse use the provisional flat model (+1/−1 per stack). The wider card and
        enemy catalogues are still in progress.
      </p>
      <p role="status" aria-live="polite">
        {error || s.message}
      </p>
      {saveError && <p role="alert">The run could not be saved. Play can continue in this session.</p>}
      {s.phase === "battle" && (
        <>
          <div className="battle-board">
            <section className="battle-panel">
              <h2>You</h2>
              <p>
                HP {s.player.hp}/{s.player.maxHp} · Mana {s.mana}/3
              </p>
              <p>Statuses: {statuses(s.player)}</p>
              <p>
                Library {s.zones.library.length} · Discard {s.zones.discard.length} · Banished{" "}
                {s.zones.banished.length}
              </p>
              {s.zones.scry && <p>Scry: {top ? face(top).name : "library empty"}</p>}
            </section>
            <section className="battle-panel battle-enemy">
              <img className="battle-enemy-art" src={art("enemy", enemy.name)} alt="" />
              <h2>
                {enemy.name} · HP {s.enemy.hp}/{s.enemy.maxHp}
              </h2>
              <p>Weakness: {enemy.weakness} (+2 on first matching hit)</p>
              <p>Statuses: {statuses(s.enemy)}</p>
              <p>
                <strong>Next: {enemy.actions[s.action]!.name}</strong> —{" "}
                {s.enemy.freeze ? (
                  "Frozen: this action is skipped."
                ) : s.enemy.hush && action.ability ? (
                  "Hushed: this ability is skipped."
                ) : s.enemy.hush ? (
                  "Hushed: base attack only; the trait is suppressed."
                ) : (
                  <Description text={action.text} />
                )}
              </p>
              {enemyHits && !s.enemy.freeze && (
                <p>
                  Current attack: {enemyHits.join(" + ")} {action.type} damage before Ward and Reflect (base{" "}
                  {action.hit}; trait{" "}
                  {s.enemy.hush
                    ? "suppressed"
                    : action.traitBonus
                      ? `+${action.traitBonus} to first hit`
                      : action.extra !== undefined
                        ? `+${action.extra} extra hit`
                        : "none"}
                  ; Bless {s.enemy.bless}, Curse {s.enemy.curse}).
                </p>
              )}
              <p>
                Trait: {enemy.trait} — {enemy.traitEffect} Pattern:{" "}
                {enemy.actions.map((a) => a.name).join(" → ")}
              </p>
            </section>
          </div>
          <section aria-labelledby="hand-title">
            <h2 id="hand-title">Your hand</h2>
            <div className="battle-hand">
              {s.zones.hand.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="battle-card"
                  aria-pressed={selected === card.id}
                  onClick={() => {
                    setSelected(card.id);
                    setTargets([]);
                    setError("");
                  }}
                >
                  <img className="battle-card-art" src={art("card", face(card).name)} alt="" />
                  <strong>{face(card).name}</strong>
                  <span>
                    {card.face} · {card.kept ? "Kept · " : ""}1 mana
                  </span>
                  <span>
                    <Description text={face(card).effect} />
                  </span>
                </button>
              ))}
            </div>
          </section>
          {selectedCard && (
            <section className="battle-panel" aria-label="Selected card">
              <h2>{face(selectedCard).name}</h2>
              <p>
                <Description text={face(selectedCard).effect} />
              </p>
              {cardHits && (
                <p>
                  Current attack: {cardHits.join(" + ")} {cardAttack!.type} damage before Ward and Reflect
                  (base {cardAttack!.hits.join(" + ")}; weakness{" "}
                  {cardAttack!.type === enemy.weakness ? "+2 to first hit" : "none"}; Bless {s.player.bless},
                  Curse {s.player.curse}).
                </p>
              )}
              {genericAttack?.op === "attack-ignore-ward" && (
                <p>This attack ignores Ward, including if reflected.</p>
              )}
              {opposite && (
                <p>
                  Other face: <strong>{opposite.name}</strong> — <Description text={opposite.effect} />
                </p>
              )}
              {(selectedName === "Moon" ||
                selectedName === "Key" ||
                face(selectedCard).ops?.some((op) => op.op === "flip-hand")) && (
                <p>
                  Flip preview:{" "}
                  {s.zones.hand
                    .filter((card) => card.id !== selected)
                    .map((card) => {
                      const other = cards[card.pair]![card.face === "light" ? "dark" : "light"];
                      return `${face(card).name} → ${other.name} (${other.effect})`;
                    })
                    .join("; ") || "no other cards in hand"}
                  .
                  {(selectedName === "Key" || face(selectedCard).ops?.some((op) => op.op === "draw")) &&
                    " Any card drawn first will also flip; its identity is not revealed yet."}
                </p>
              )}
              {face(selectedCard).ops?.some((op) => op.op === "flip-random") && (
                <p>
                  Random Flip eligible cards:{" "}
                  {s.zones.hand
                    .filter((card) => card.id !== selected)
                    .map((card) => {
                      const other = cards[card.pair]![card.face === "light" ? "dark" : "light"];
                      return `${face(card).name} → ${other.name} (${other.effect})`;
                    })
                    .join("; ") || "none"}
                  . The random selection happens after play.
                </p>
              )}
              {face(selectedCard)
                .ops?.filter((op) => op.op === "banish-discard" || op.op === "return-discard")
                .map((op, index) => {
                  const card = op.position === "top" ? s.zones.discard.at(-1) : s.zones.discard[0];
                  return (
                    <p key={index}>
                      {op.position === "top" ? "Top" : "Bottom"} of discard:{" "}
                      {card ? face(card).name : "empty"}.
                    </p>
                  );
                })}
              {face(selectedCard).keywords.some((keyword) => keywordHelp[keyword]) && (
                <ul aria-label="Keyword explanations">
                  {face(selectedCard)
                    .keywords.filter((keyword) => keywordHelp[keyword])
                    .map((keyword) => (
                      <li key={keyword}>
                        <strong>{keyword}:</strong> {keywordHelp[keyword]}
                      </li>
                    ))}
                </ul>
              )}
              {selectedName === "Seed" && (
                <p>
                  Bottom of discard:{" "}
                  {s.zones.discard
                    .slice(0, 2)
                    .map((card) => face(card).name)
                    .join(", ") || "empty"}
                </p>
              )}
              {needsTarget && (
                <>
                  <p>Choose a card from your discard pile.</p>
                  <div className="battle-targets">
                    {targetZone.length === 0 ? (
                      <span>No eligible cards.</span>
                    ) : (
                      targetZone.map((card: FightCard) => (
                        <button
                          type="button"
                          key={card.id}
                          aria-pressed={targets.includes(card.id)}
                          onClick={() => toggleTarget(card.id)}
                        >
                          {face(card).name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
              {unavailable && <p>{unavailable}</p>}
              <Button
                disabled={!canPlay}
                onClick={() => dispatch({ type: "play", id: selectedCard.id, targets })}
              >
                Play {face(selectedCard).name}
              </Button>
            </section>
          )}
          <div className="battle-actions">
            <Button onClick={() => dispatch({ type: "end" })}>End turn</Button>
            <Button onClick={() => dispatch({ type: "concede" })}>Concede</Button>
          </div>
        </>
      )}
      {s.phase === "reward" && (
        <div className="battle-rewards">
          {s.offers.map((pair) => (
            <button key={pair} className="battle-reward" onClick={() => dispatch({ type: "reward", pair })}>
              <strong>{pair}</strong>
              <span>
                {cards[pair]!.light.name}: {cards[pair]!.light.effect}
              </span>
              <span>
                {cards[pair]!.dark.name}: {cards[pair]!.dark.effect}
              </span>
            </button>
          ))}
          <Button onClick={() => dispatch({ type: "reward", pair: null })}>Skip reward</Button>
        </div>
      )}
      {s.phase === "rest" && (
        <section className="battle-panel">
          <Button onClick={() => dispatch({ type: "rest" })}>Heal 6 HP</Button>
          <h2>Or remove one card</h2>
          <div className="battle-targets">
            {s.deck.map((card) => (
              <button key={card.id} onClick={() => dispatch({ type: "rest", remove: card.id })}>
                {card.pair}
              </button>
            ))}
          </div>
        </section>
      )}
      {(s.phase === "victory" || s.phase === "defeat") && (
        <section className="battle-panel">
          <p>
            Fights reached: {s.fight + 1} of {route.length}. Cards in deck: {s.deck.length}.
          </p>
          <Button onClick={exitBattle}>Return to main menu</Button>
        </section>
      )}
    </main>
  );
}
