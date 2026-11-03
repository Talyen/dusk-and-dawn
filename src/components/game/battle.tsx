import { simpleEnemies } from "../../lib/game/simple-enemies.generated";
import { useEffect, useId, useRef, useState } from "react";
import {
  cards,
  cardRestriction,
  createRun,
  enemyAttackHits,
  face,
  getEnemy,
  route,
  type Command,
  type RunState,
} from "../../lib/game/run";
import { scryTop, type FightCard } from "../../lib/game/card-zones";
import { attackValues, type DamageType } from "../../lib/game/combat-status";
import { encodeRun, readRunWithRecovery, resumeRun } from "../../lib/game/run-save";
import { readProgression, recordExpedition, unlockTier } from "../../lib/game/progression";
import {
  browserSaveBackend,
  desktopSaveBackend,
  type DesktopSaveBridge,
  type SaveBackend,
} from "../../lib/save/save";
import type { Snapshot } from "../../lib/game/session";
import { Button } from "../ui/controls";
import { Tooltip } from "../ui/tooltip";
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
  Bless:
    "The next direct attack gains damage on every hit; then all Bless is spent. This preview uses +1 per stack.",
  Curse:
    "The next direct attack has reduced damage per stack; then all Curse is spent. This preview uses −1 per stack.",
  Cleanse: "Remove the specified harmful statuses from yourself; a single kind is chosen randomly.",
  Purge: "Remove the specified beneficial statuses from the enemy; a single kind is chosen randomly.",
  Keep: "A kept card stays in hand at end turn, then loses its Keep marker.",
  Reflect: "Redirect the first hit of the next attack back to its attacker, then remove Reflect.",
  Hush: "Suppress the next action's trait, or skip its non-attack ability; then remove Hush.",
  Freeze:
    "If still active at the next enemy action, skip it and remove Freeze. Early thaw rules are undecided.",
  Leech: "Heal for the attack's final damage before Ward, including overkill, up to maximum HP.",
};
function BattleCard({
  card,
  selected,
  disabled,
  onSelect,
}: {
  card: FightCard;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pointer = useRef(false);
  const focus = useRef(false);
  const [open, setOpen] = useState(false);
  const info = face(card);
  useEffect(() => {
    if (!open) return;
    const dismiss = () => {
      pointer.current = false;
      focus.current = false;
      setOpen(false);
    };
    document.addEventListener("wheel", dismiss, { capture: true, passive: true });
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("wheel", dismiss, true);
      window.removeEventListener("blur", dismiss);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="battle-card"
        aria-pressed={selected}
        aria-describedby={open ? id : undefined}
        disabled={disabled}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = true;
            setOpen(true);
          }
        }}
        onPointerLeave={() => {
          pointer.current = false;
          if (!focus.current) setOpen(false);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            focus.current = true;
            setOpen(true);
          }
        }}
        onBlur={() => {
          focus.current = false;
          if (!pointer.current) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            pointer.current = false;
            focus.current = false;
            setOpen(false);
          }
        }}
        onClick={onSelect}
      >
        <img className="battle-card-art" src={art("card", info.name)} alt="" />
        <strong>{info.name}</strong>
        <span>
          {card.face} · {card.kept ? "Kept · " : ""}1 mana
        </span>
        <span>
          <Description text={info.effect} />
        </span>
      </button>
      <Tooltip triggerRef={trigger} id={id} open={open}>
        <strong>{info.name}</strong>
        <p>
          <Description text={info.effect} />
        </p>
        {info.keywords
          .filter((keyword) => keywordHelp[keyword])
          .map((keyword) => (
            <p key={keyword}>
              <strong>{keyword}</strong> {keywordHelp[keyword]}
            </p>
          ))}
      </Tooltip>
    </>
  );
}

const directCardAttacks: Record<string, { hits: number[]; type: DamageType }> = {
  Sacrifice: { hits: [8], type: "Radiance" },
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

export function Battle({
  onExit,
  onDiscover,
}: {
  onExit: () => void;
  onDiscover: (ids: readonly string[]) => void;
}) {
  const [backend] = useState(saveBackend);
  const [loaded, setLoaded] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [orientation, setOrientation] = useState<"light" | "dark">("light");
  const [relic, setRelic] = useState<"none" | "many-eyes" | "spare-thread" | "cracked-vessel">("none");
  const [progress, setProgress] = useState(() => {
    try {
      return readProgression(window.localStorage);
    } catch {
      return readProgression(null);
    }
  });
  const tier = unlockTier(progress);
  const [saved, setSaved] = useState<{ snapshot: Snapshot<RunState>; recovered: boolean } | null>(null);
  const [game, setGame] = useState<{
    session: ReturnType<typeof createRun>;
    isNew: boolean;
    recovered: boolean;
  } | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    void readRunWithRecovery(backend)
      .then((savedRun) => {
        if (!active) return;
        setSaved(savedRun);
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
      <section className="battle-screen">
        <p role="status">Loading run…</p>
      </section>
    );
  if (!game)
    return (
      <section className="battle-screen battle-setup">
        <h1>Play</h1>
        {loadError && <p role="alert">{loadError}</p>}
        {saved?.recovered && <p>A retained copy of the run was recovered.</p>}
        {saved && <p>Starting a new run replaces the current saved run.</p>}
        <div className="battle-setup__actions">
          {saved && (
            <Button
              onClick={() =>
                setGame({ session: resumeRun(saved.snapshot), isNew: false, recovered: saved.recovered })
              }
            >
              Continue run
            </Button>
          )}
          <Button
            onClick={() =>
              setGame({
                session: createRun(Math.floor(Math.random() * 0x100000000)),
                isNew: true,
                recovered: false,
              })
            }
          >
            Start new run
          </Button>
          <Button onClick={() => setConfiguring(!configuring)}>
            {configuring ? "Hide expedition options" : "Configure expedition"}
          </Button>
        </div>
        {configuring && (
          <section className="battle-panel" aria-label="Expedition options">
            <h2>Experimental expedition</h2>
            <p>
              Two optional branching detours. Complete expeditions to expand future card and enemy pools; the
              current deck never changes from an unlock.
            </p>
            <p>
              Pool tier {tier}/3 · {progress.completed.length} qualifying expedition
              {progress.completed.length === 1 ? "" : "s"} completed.
            </p>
            <div className="battle-setup__fields">
              <label>
                Starting orientation{" "}
                <select
                  value={orientation}
                  onChange={(event) => setOrientation(event.target.value as "light" | "dark")}
                >
                  <option value="light">Lamplighter · light each fight</option>
                  <option value="dark" disabled={tier < 2}>
                    Nocturne · dark each fight{tier < 2 ? " (unlock after one expedition)" : ""}
                  </option>
                </select>
              </label>
              <label>
                {" "}
                Run relic{" "}
                <select value={relic} onChange={(event) => setRelic(event.target.value as typeof relic)}>
                  <option value="none">None</option>
                  <option value="many-eyes">Many Eyes · four reward offers</option>
                  <option value="spare-thread">Spare Thread · a second midpoint removal</option>
                  <option value="cracked-vessel">Cracked Vessel · start at 24 HP with an extra pair</option>
                </select>
              </label>
            </div>
            <p>Provisional values; reaching the second fight qualifies for progression.</p>
            <Button
              onClick={() =>
                setGame({
                  session: createRun(Math.floor(Math.random() * 0x100000000), {
                    id: crypto.randomUUID(),
                    tier,
                    orientation,
                    relic,
                  }),
                  isNew: true,
                  recovered: false,
                })
              }
            >
              Start expedition
            </Button>
          </section>
        )}
        <Button onClick={onExit}>Main menu</Button>
      </section>
    );
  return (
    <BattleSession
      game={game.session}
      isNew={game.isNew}
      recovered={game.recovered}
      backend={backend}
      onExit={onExit}
      onDiscover={onDiscover}
      onComplete={(id) => {
        try {
          setProgress(recordExpedition(window.localStorage, id));
        } catch {
          /* Keep playing without progression storage. */
        }
      }}
    />
  );
}

function BattleSession({
  game,
  isNew,
  recovered,
  backend,
  onExit,
  onDiscover,
  onComplete,
}: {
  game: ReturnType<typeof createRun>;
  isNew: boolean;
  recovered: boolean;
  backend: SaveBackend;
  onExit: () => void;
  onDiscover: (ids: readonly string[]) => void;
  onComplete: (id: string) => void;
}) {
  const [snapshot, setSnapshot] = useState(game.getSnapshot);
  const [selected, setSelected] = useState<string | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const preserveBackup = useRef(recovered);
  function persist(next: Snapshot<RunState>) {
    const encoded = encodeRun(next);
    writes.current = writes.current
      .catch(() => undefined)
      .then(async () => {
        await backend.write(encoded, { preserveBackup: preserveBackup.current });
        preserveBackup.current = false;
      });
    void writes.current.then(() => setSaveError(false)).catch(() => setSaveError(true));
  }
  useEffect(() => {
    if (isNew) persist(game.getSnapshot());
  }, [game, isNew]);
  function exitBattle() {
    void writes.current.catch(() => undefined).then(onExit);
  }
  const s = snapshot.state;
  const completed = useRef(false);
  useEffect(() => {
    if (
      !completed.current &&
      s.experiment &&
      s.fight >= 1 &&
      (s.phase === "victory" || s.phase === "defeat")
    ) {
      completed.current = true;
      onComplete(s.experiment.id);
    }
  }, [s.experiment, s.fight, s.phase, onComplete]);
  useEffect(() => {
    const visiblePairs = [...s.deck.map((card) => card.pair), ...s.offers];
    const ids = visiblePairs.flatMap((pair) => [
      `card:${cards[pair]!.light.name}`,
      `card:${cards[pair]!.dark.name}`,
    ]);
    const enemy = getEnemy(s);
    const enemyEntry = simpleEnemies.find((entry) => entry.name === enemy.name);
    if (enemyEntry) ids.push(`enemy:${enemyEntry.id}`);
    onDiscover(ids);
  }, [snapshot, onDiscover]);
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
  const targetZone =
    selectedName === "Memory"
      ? s.zones.discard
      : selectedName === "Sacrifice"
        ? s.zones.hand.filter((card) => card.id !== selected)
        : [];
  const needsTarget = (selectedName === "Memory" || selectedName === "Sacrifice") && targetZone.length > 1;
  const fixedDiscard =
    (selectedCard ? face(selectedCard).ops : undefined)?.flatMap((op) => {
      if (op.op === "banish-discard" || op.op === "return-discard")
        return [
          {
            position: op.position,
            cards: op.position === "top" ? s.zones.discard.slice(-1).reverse() : s.zones.discard.slice(0, 1),
          },
        ];
      if (op.op === "discard-library-top")
        return [
          {
            position: op.position,
            cards:
              op.position === "top"
                ? s.zones.discard.slice(-op.count).reverse()
                : s.zones.discard.slice(0, op.count).reverse(),
          },
        ];
      if (op.op === "discard-library-bottom")
        return [{ position: "bottom", cards: s.zones.discard.slice(0, op.count).reverse() }];
      if (op.op === "return-top-discard")
        return [
          {
            position: "top",
            cards: s.zones.discard
              .slice(-op.count)
              .reverse()
              .slice(0, 8 - (s.zones.hand.length - 1)),
          },
        ];
      if (op.op === "flip-discard-top" || op.op === "light-discard-top")
        return [{ position: "top", cards: s.zones.discard.slice(-1) }];
      return [];
    }) ?? [];
  const maxTargets = s.pending ? s.pending.required : 1;
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
  const enemy = getEnemy(s);
  const action = enemy.actions[s.action]!;
  const enemyHits =
    action.hit === undefined
      ? null
      : attackValues(
          enemyAttackHits(action, s.enemy.hush, s.latestDirectHit),
          s.enemy.bless,
          s.enemy.curse,
          0,
          "flat-preview",
        );
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
    <section className="battle-screen" aria-labelledby="battle-title">
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
                  : s.phase === "route"
                    ? "Choose a path"
                    : s.phase === "victory"
                      ? "Victory"
                      : "Run ended"}
          </h1>
        </div>
        {s.phase !== "battle" && <Button onClick={exitBattle}>Main menu</Button>}
      </div>
      <p className="battle-preview">
        Preview rules: Bless and Curse use the provisional flat model (+1/−1 per stack).
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
              <figure className="battle-enemy-figure">
                <img className="battle-enemy-art" src={art("enemy", enemy.name)} alt="" />
                <progress aria-label={`${enemy.name} health`} value={s.enemy.hp} max={s.enemy.maxHp} />
              </figure>
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
                        : action.extraHits?.length
                          ? `+${action.extraHits.join(" + ")} extra hits`
                          : "none"}
                  ; Bless {s.enemy.bless}, Curse {s.enemy.curse}).
                </p>
              )}
              <p>
                Trait: {enemy.trait} — {enemy.traitEffect} Pattern:{" "}
                {enemy.actions.map((a) => a.name).join(" → ")}
              </p>
              <details>
                <summary>Inspect full pattern</summary>
                <ol>
                  {enemy.actions.map((a, index) => (
                    <li key={`${a.name}-${index}`}>
                      <strong>{a.name}:</strong> <Description text={a.text} />
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          </div>
          <section aria-labelledby="hand-title">
            <h2 id="hand-title">Your hand</h2>
            <div className="battle-hand">
              {s.zones.hand.map((card) => (
                <BattleCard
                  key={card.id}
                  card={card}
                  selected={selected === card.id}
                  disabled={!!s.pending}
                  onSelect={() => {
                    setSelected(card.id);
                    setTargets([]);
                    setError("");
                  }}
                />
              ))}
            </div>
          </section>
          {s.pending && (
            <section
              id="committed-inspection"
              className="battle-panel battle-details"
              aria-label="Committed inspection"
            >
              <h2>
                {s.pending.kind === "order"
                  ? "Choose top-to-bottom order"
                  : `Choose ${s.pending.required} for your hand`}
              </h2>
              <p>
                Mana is spent and the inspection cannot be canceled.{" "}
                {s.pending.kind === "order"
                  ? "Select each card in the order it should be drawn."
                  : "Unchosen cards keep their library order."}
              </p>
              <div className="battle-targets">
                {s.pending.cards.map((card) => (
                  <button
                    type="button"
                    key={card.id}
                    aria-pressed={targets.includes(card.id)}
                    onClick={() => toggleTarget(card.id)}
                  >
                    {targets.includes(card.id) && s.pending?.kind === "order"
                      ? `${targets.indexOf(card.id) + 1}. `
                      : ""}
                    {face(card).name} — {face(card).effect}
                  </button>
                ))}
              </div>
              <Button
                disabled={targets.length !== s.pending.required}
                onClick={() => dispatch({ type: "choose", ids: targets })}
              >
                Confirm choice
              </Button>
            </section>
          )}
          {selectedCard && !s.pending && (
            <section
              id="selected-card-details"
              className="battle-panel battle-details"
              aria-label="Selected card"
            >
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
              {fixedDiscard.map((target, index) => (
                <p key={index}>
                  {target.position === "top" ? "Top" : "Bottom"} of discard (top to bottom):{" "}
                  {target.cards.map((card) => face(card).name).join(", ") || "empty"}.
                </p>
              ))}
              {face(selectedCard)
                .ops?.filter((op) => op.op === "turn-random")
                .map((op, index) => (
                  <p key={index}>
                    Eligible {op.from} cards:{" "}
                    {s.zones.hand
                      .filter((card) => card.id !== selected && card.face === op.from)
                      .map((card) => face(card).name)
                      .join(", ") || "none"}
                    . A card is chosen after play.
                  </p>
                ))}
              {selectedName === "Water Clock" &&
                s.zones.hand.length === 8 &&
                (s.zones.library.length > 0 || s.zones.discard.length > 0) && (
                  <p>Drawing will fill your hand, so this card cannot return to it with Keep.</p>
                )}
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
                    .reverse()
                    .map((card) => face(card).name)
                    .join(", ") || "empty"}
                </p>
              )}
              {(selectedName === "Memory" || selectedName === "Sacrifice") && targetZone.length === 1 && (
                <p>Automatic target: {face(targetZone[0]!).name}.</p>
              )}
              {selectedName === "Memory" && targetZone.length === 0 && <p>No cards in the discard pile.</p>}
              {needsTarget && (
                <>
                  <p>
                    {selectedName === "Sacrifice"
                      ? "Choose another card in your hand to Banish."
                      : "Choose a card from your discard pile."}
                  </p>
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
            </section>
          )}
          <div className="battle-actions" role="group" aria-label="Battle actions">
            {s.pending ? (
              <a href="#committed-inspection">Choose cards</a>
            ) : selectedCard ? (
              <>
                <span className="battle-actions__selection">
                  {face(selectedCard).name}
                  {needsTarget && !targets.length ? " · choose a target" : ""}
                </span>
                <a href="#selected-card-details">Details</a>
                <Button
                  disabled={!canPlay}
                  onClick={() => dispatch({ type: "play", id: selectedCard.id, targets })}
                >
                  Play {face(selectedCard).name}
                </Button>
              </>
            ) : (
              <span className="battle-actions__selection">Select a card to play</span>
            )}
            <Button disabled={!!s.pending} onClick={() => dispatch({ type: "end" })}>
              End turn
            </Button>
            <Button disabled={!!s.pending} onClick={() => dispatch({ type: "concede" })}>
              Concede
            </Button>
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
      {s.phase === "route" &&
        s.experiment?.route &&
        (() => {
          const path = s.experiment.route;
          const enemy = simpleEnemies.find((entry) => entry.id === path.enemy)!;
          return (
            <section className="battle-panel" aria-label="Route choices">
              <p>All paths lead to the next scheduled fight. The detour grants an extra card reward.</p>
              <div className="battle-targets">
                <button onClick={() => dispatch({ type: "route", choice: "combat" })}>
                  Combat: {enemy.name} · {enemy.hp} HP · weakness {enemy.weakness} · extra reward
                </button>
                <button onClick={() => dispatch({ type: "route", choice: "rest" })}>Rest: heal 4 HP</button>
                <button
                  disabled={s.player.hp <= 4}
                  onClick={() => dispatch({ type: "route", choice: "event" })}
                >
                  Event: lose 4 HP, add {path.pair}
                </button>
              </div>
              <p>
                Combat preview: {enemy.trait}: {enemy.traitEffect} Pattern:{" "}
                {enemy.actions.map((action) => `${action.name}: ${action.text}`).join(" → ")}
              </p>
              <p>
                Event pair: {cards[path.pair]!.light.name}: {cards[path.pair]!.light.effect} /{" "}
                {cards[path.pair]!.dark.name}: {cards[path.pair]!.dark.effect}
              </p>
            </section>
          );
        })()}
      {s.phase === "rest" && (
        <section className="battle-panel">
          <Button onClick={() => dispatch({ type: "rest" })}>
            {s.experiment?.restRemovals ? "Continue without another removal" : "Heal 6 HP"}
          </Button>
          <h2>{s.experiment?.restRemovals ? "Remove one more card" : "Or remove one card"}</h2>
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
            Scheduled fights reached: {s.fight + 1} of {route.length}. Cards in deck: {s.deck.length}.
          </p>
          <Button onClick={exitBattle}>Return to main menu</Button>
        </section>
      )}
    </section>
  );
}
