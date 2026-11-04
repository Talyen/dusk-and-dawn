import { simpleEnemies } from "../../lib/game/simple-enemies.generated";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
import { useTouchInspection } from "../cards/use-touch-inspection";
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
  exhausted,
  angle,
  drop,
  preview,
  onSelect,
}: {
  card: FightCard;
  selected: boolean;
  disabled: boolean;
  exhausted: boolean;
  angle: number;
  drop: number;
  preview: ReactNode;
  onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pointer = useRef(false);
  const focus = useRef(false);
  const [open, setOpen] = useState(false);
  const touchPinned = useRef(false);
  const touch = useTouchInspection<HTMLButtonElement>(() => {
    touchPinned.current = true;
    setOpen(true);
  });
  const info = face(card);
  const other = cards[card.pair]![card.face === "light" ? "dark" : "light"];
  useEffect(() => {
    if (!open) return;
    const dismiss = () => {
      pointer.current = false;
      focus.current = false;
      touchPinned.current = false;
      setOpen(false);
    };
    const outside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) dismiss();
    };
    const focusOutside = (event: FocusEvent) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) dismiss();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", focusOutside, true);
    document.addEventListener("wheel", dismiss, { capture: true, passive: true });
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", focusOutside, true);
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
        style={
          {
            "--card-art": `url("${art("card", info.name)}")`,
            "--fan-angle": `${angle}deg`,
            "--fan-drop": `${drop}px`,
          } as React.CSSProperties
        }
        data-selected={selected || undefined}
        data-kept={card.kept || undefined}
        data-exhausted={exhausted || undefined}
        aria-disabled={exhausted || undefined}
        aria-describedby={open ? id : undefined}
        disabled={disabled}
        onPointerDown={touch.onPointerDown}
        onPointerMove={touch.onPointerMove}
        onPointerUp={touch.onPointerUp}
        onPointerCancel={touch.onPointerCancel}
        onContextMenu={touch.onContextMenu}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = true;
            setOpen(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "touch") return;
          pointer.current = false;
          if (!focus.current && !touchPinned.current) setOpen(false);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            focus.current = true;
            setOpen(true);
          }
        }}
        onBlur={() => {
          focus.current = false;
          if (!pointer.current && !touchPinned.current) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            pointer.current = false;
            focus.current = false;
            touchPinned.current = false;
            setOpen(false);
          }
        }}
        onClick={(event) => {
          if (touch.consumeClick()) {
            event.preventDefault();
            return;
          }
          if (!exhausted) onSelect(event);
        }}
      >
        <img className="battle-card-art" src={art("card", info.name)} alt="" />
        <span className="battle-card-description">
          <strong>{info.name}</strong> {card.face} · {card.kept ? "Kept · " : ""}1 mana. {info.effect}
        </span>
      </button>
      <Tooltip triggerRef={trigger} id={id} open={open} className="battle-tooltip">
        <strong>{info.name}</strong>
        <p>1 mana{card.kept ? " · Kept" : ""}</p>
        <p>
          <Description text={info.effect} />
        </p>
        <p>
          Other face: <strong>{other.name}</strong> — <Description text={other.effect} />
        </p>
        {preview}
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

function EnemyPortrait({
  name,
  hp,
  maxHp,
  children,
}: {
  name: string;
  hp: number;
  maxHp: number;
  children: ReactNode;
}) {
  const trigger = useRef<HTMLDivElement>(null);
  const id = useId();
  const pointer = useRef(false);
  const focus = useRef(false);
  const [open, setOpen] = useState(false);
  const touchPinned = useRef(false);
  const touch = useTouchInspection<HTMLDivElement>(() => {
    touchPinned.current = true;
    setOpen(true);
  });
  useEffect(() => {
    if (!open) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) {
        touchPinned.current = false;
        setOpen(false);
      }
    };
    const focusOutside = (event: FocusEvent) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) {
        pointer.current = false;
        focus.current = false;
        touchPinned.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", focusOutside, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", focusOutside, true);
    };
  }, [open]);
  return (
    <figure className="battle-enemy-figure">
      <div
        ref={trigger}
        className="battle-enemy-trigger"
        role="img"
        tabIndex={0}
        aria-label={`${name}, ${hp} of ${maxHp} HP`}
        aria-describedby={open ? id : undefined}
        onPointerDown={touch.onPointerDown}
        onPointerMove={touch.onPointerMove}
        onPointerUp={touch.onPointerUp}
        onPointerCancel={touch.onPointerCancel}
        onContextMenu={touch.onContextMenu}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = true;
            setOpen(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "touch") return;
          pointer.current = false;
          if (!focus.current && !touchPinned.current) setOpen(false);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            focus.current = true;
            setOpen(true);
          }
        }}
        onBlur={() => {
          focus.current = false;
          if (!pointer.current && !touchPinned.current) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            pointer.current = false;
            focus.current = false;
            touchPinned.current = false;
            setOpen(false);
          }
        }}
      >
        <img className="battle-enemy-art" src={art("enemy", name)} alt="" />
      </div>
      <progress aria-label={`${name} health`} value={hp} max={maxHp} />
      <Tooltip triggerRef={trigger} id={id} open={open} placement="right" className="battle-tooltip">
        {children}
      </Tooltip>
    </figure>
  );
}

function RewardCard({ pair, onChoose }: { pair: string; onChoose: () => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pointer = useRef(false);
  const focus = useRef(false);
  const [open, setOpen] = useState(false);
  const touchPinned = useRef(false);
  const touch = useTouchInspection<HTMLButtonElement>(() => {
    touchPinned.current = true;
    setOpen(true);
  });
  useEffect(() => {
    if (!open) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) {
        touchPinned.current = false;
        setOpen(false);
      }
    };
    const focusOutside = (event: FocusEvent) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) {
        pointer.current = false;
        focus.current = false;
        touchPinned.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", focusOutside, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", focusOutside, true);
    };
  }, [open]);
  const light = cards[pair]!.light;
  const dark = cards[pair]!.dark;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="battle-reward"
        onClick={(event) => {
          if (touch.consumeClick()) {
            event.preventDefault();
            return;
          }
          onChoose();
        }}
        aria-label={`${pair}. ${light.name}: ${light.effect} ${dark.name}: ${dark.effect}`}
        aria-describedby={open ? id : undefined}
        onPointerDown={touch.onPointerDown}
        onPointerMove={touch.onPointerMove}
        onPointerUp={touch.onPointerUp}
        onPointerCancel={touch.onPointerCancel}
        onContextMenu={touch.onContextMenu}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = true;
            setOpen(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "touch") return;
          pointer.current = false;
          if (!focus.current && !touchPinned.current) setOpen(false);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            focus.current = true;
            setOpen(true);
          }
        }}
        onBlur={() => {
          focus.current = false;
          if (!pointer.current && !touchPinned.current) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            pointer.current = false;
            focus.current = false;
            touchPinned.current = false;
            setOpen(false);
          }
        }}
      >
        <span className="battle-reward-art" aria-hidden="true">
          <img src={art("card", light.name)} alt="" />
          <img src={art("card", dark.name)} alt="" />
        </span>
      </button>
      <Tooltip triggerRef={trigger} id={id} open={open} className="battle-tooltip">
        <strong>{light.name}</strong>
        <p>
          <Description text={light.effect} />
        </p>
        <strong>{dark.name}</strong>
        <p>
          <Description text={dark.effect} />
        </p>
      </Tooltip>
    </>
  );
}

function RouteChoice({
  label,
  caption,
  disabled,
  onChoose,
  art: artwork,
  children,
}: {
  label: string;
  caption: string;
  disabled?: boolean;
  onChoose: () => void;
  art: ReactNode;
  children: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pointer = useRef(false);
  const focus = useRef(false);
  const pinned = useRef(false);
  const [open, setOpen] = useState(false);
  const touch = useTouchInspection<HTMLButtonElement>(() => {
    pinned.current = true;
    setOpen(true);
  });
  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: Event) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) {
        pointer.current = false;
        focus.current = false;
        pinned.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("focusin", dismissOutside, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("focusin", dismissOutside, true);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="battle-route-choice"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        disabled={disabled}
        onClick={(event) => {
          if (touch.consumeClick()) event.preventDefault();
          else onChoose();
        }}
        onPointerDown={touch.onPointerDown}
        onPointerMove={touch.onPointerMove}
        onPointerUp={touch.onPointerUp}
        onPointerCancel={touch.onPointerCancel}
        onContextMenu={touch.onContextMenu}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = true;
            setOpen(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = false;
            if (!focus.current && !pinned.current) setOpen(false);
          }
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            focus.current = true;
            setOpen(true);
          }
        }}
        onBlur={() => {
          focus.current = false;
          if (!pointer.current && !pinned.current) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            pointer.current = false;
            focus.current = false;
            pinned.current = false;
            setOpen(false);
          }
        }}
      >
        {artwork}
        <span>{caption}</span>
      </button>
      <Tooltip
        triggerRef={trigger}
        id={id}
        open={open}
        placement="bottom"
        overlayNarrow
        className="battle-tooltip"
      >
        {children}
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

function cardPreview(s: RunState, card: FightCard): ReactNode {
  const info = face(card);
  const ops = info.ops ?? [];
  const hand = s.zones.hand.filter((other) => other.id !== card.id);
  const flipped = hand.map((other) => {
    const next = cards[other.pair]![other.face === "light" ? "dark" : "light"];
    return `${face(other).name} → ${next.name}`;
  });
  const lines: string[] = [];
  const generic = ops.find((op) => op.op === "attack" || op.op === "attack-ignore-ward");
  const hit =
    directCardAttacks[info.name] ??
    (generic
      ? {
          hits: Array(generic.op === "attack" ? generic.hits : 1).fill(generic.amount) as number[],
          type: generic.type,
        }
      : undefined);
  if (hit) {
    const enemy = getEnemy(s);
    const values = attackValues(
      hit.hits,
      s.player.bless,
      s.player.curse,
      hit.type === enemy.weakness ? 2 : 0,
      "flat-preview",
    );
    lines.push(`Current attack: ${values.join(" + ")} ${hit.type} damage before Ward and Reflect.`);
    if (generic?.op === "attack-ignore-ward") lines.push("This attack ignores Ward, including if reflected.");
  }
  if (info.name === "Moon" || info.name === "Key" || ops.some((op) => op.op === "flip-hand")) {
    lines.push(`Flip preview: ${flipped.join("; ") || "no other cards in hand"}.`);
    if (info.name === "Key" || ops.some((op) => op.op === "draw"))
      lines.push("Any card drawn first will also flip; its identity is not revealed yet.");
  }
  if (ops.some((op) => op.op === "flip-random"))
    lines.push(
      `Random Flip eligible cards: ${flipped.join("; ") || "none"}. The random selection happens after play.`,
    );
  const handMove = info.name === "Funnel" ? "top" : ops.find((op) => op.op === "hand-library")?.position;
  if (handMove)
    lines.push(
      `Hand to library ${handMove} (draw order within moved cards): ${hand.map((other) => face(other).name).join(", ") || "none"}. Keep markers on moved cards are cleared.`,
    );
  for (const op of ops) {
    if (
      op.op === "banish-discard" ||
      op.op === "return-discard" ||
      op.op === "discard-library-top" ||
      op.op === "discard-library-bottom" ||
      op.op === "return-top-discard" ||
      op.op === "flip-discard-top" ||
      op.op === "light-discard-top"
    ) {
      const position =
        op.op === "discard-library-bottom"
          ? "bottom"
          : op.op === "return-top-discard" || op.op === "flip-discard-top" || op.op === "light-discard-top"
            ? "top"
            : op.position;
      let chosen: FightCard[];
      if (op.op === "return-top-discard")
        chosen = s.zones.discard
          .slice(-op.count)
          .reverse()
          .slice(0, 8 - hand.length);
      else if (op.op === "discard-library-top" || op.op === "discard-library-bottom")
        chosen =
          position === "top"
            ? s.zones.discard.slice(-op.count).reverse()
            : s.zones.discard.slice(0, op.count).reverse();
      else chosen = position === "top" ? s.zones.discard.slice(-1) : s.zones.discard.slice(0, 1);
      lines.push(
        `${position === "top" ? "Top" : "Bottom"} of discard (top to bottom): ${chosen.map((other) => face(other).name).join(", ") || "empty"}.`,
      );
    }
    if (op.op === "turn-random")
      lines.push(
        `Eligible ${op.from} cards: ${
          hand
            .filter((other) => other.face === op.from)
            .map((other) => face(other).name)
            .join(", ") || "none"
        }. A card is chosen after play.`,
      );
  }
  if (
    info.name === "Water Clock" &&
    s.zones.hand.length === 8 &&
    (s.zones.library.length > 0 || s.zones.discard.length > 0)
  )
    lines.push("Drawing will fill your hand, so this card cannot return to it with Keep.");
  if (info.name === "Seed")
    lines.push(
      `Bottom of discard: ${
        s.zones.discard
          .slice(0, 2)
          .reverse()
          .map((other) => face(other).name)
          .join(", ") || "empty"
      }.`,
    );
  const targets = info.name === "Memory" ? s.zones.discard : info.name === "Sacrifice" ? hand : [];
  if ((info.name === "Memory" || info.name === "Sacrifice") && targets.length === 1)
    lines.push(`Automatic target: ${face(targets[0]!).name}.`);
  if (info.name === "Memory" && !targets.length) lines.push("No cards in the discard pile.");
  const restriction = cardRestriction(s, card);
  if (restriction) lines.push(restriction);
  return lines.map((line, index) => <p key={index}>{line}</p>);
}

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
  const [feedback, setFeedback] = useState<{ revision: number; text: string } | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  const handRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pendingRef = useRef<HTMLElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const focusAfterPlay = useRef<number | null>(null);
  useEffect(() => {
    const index = focusAfterPlay.current;
    if (index === null) return;
    focusAfterPlay.current = null;
    const handButtons = handRef.current?.querySelectorAll<HTMLButtonElement>(".battle-card:not(:disabled)");
    (
      pendingRef.current ??
      handButtons?.[Math.min(index, handButtons.length - 1)] ??
      actionRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)") ??
      titleRef.current
    )?.focus();
  }, [snapshot]);
  const [selected, setSelected] = useState<string | null>(null);
  const choiceRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) choiceRef.current?.focus();
  }, [selected]);
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
  const preloadedImages = useRef<HTMLImageElement[]>([]);
  const preloadPairs = [...new Set(s.deck.map((card) => card.pair))].join("\0");
  useEffect(() => {
    preloadedImages.current = preloadPairs
      .split("\0")
      .filter(Boolean)
      .flatMap((pair) => [cards[pair]!.light, cards[pair]!.dark])
      .map((face) => {
        const image = new Image();
        image.src = art("card", face.name);
        return image;
      });
  }, [preloadPairs]);
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
    if (!result.decision.accepted) {
      focusAfterPlay.current = null;
      setError(result.decision.reason);
    } else {
      setError("");
      if (snapshot.state.phase === "battle" && (command.type === "play" || command.type === "end")) {
        const before = snapshot.state;
        const after = result.snapshot.state;
        const changes: string[] = [];
        const signed = (value: number) => (value > 0 ? `+${value}` : `−${Math.abs(value)}`);
        if (after.player.hp !== before.player.hp)
          changes.push(`You ${signed(after.player.hp - before.player.hp)} HP`);
        if (after.enemy.hp !== before.enemy.hp)
          changes.push(`${getEnemy(before).name} ${signed(after.enemy.hp - before.enemy.hp)} HP`);
        if (after.player.ward !== before.player.ward)
          changes.push(`Ward ${signed(after.player.ward - before.player.ward)}`);
        if (after.enemy.ward !== before.enemy.ward)
          changes.push(`${getEnemy(before).name} Ward ${signed(after.enemy.ward - before.enemy.ward)}`);
        for (const name of ["burn", "poison", "curse", "bless"] as const) {
          if (after.enemy[name] > before.enemy[name])
            changes.push(
              `${name[0]!.toUpperCase()}${name.slice(1)} +${after.enemy[name] - before.enemy[name]}`,
            );
        }
        const text =
          after.phase === "reward" || after.phase === "victory"
            ? `${getEnemy(before).name} defeated`
            : changes.join(" · ") ||
              (command.type === "end"
                ? before.enemy.freeze ||
                  (before.enemy.hush && getEnemy(before).actions[before.action]!.ability)
                  ? `${getEnemy(before).actions[before.action]!.name} skipped`
                  : `${getEnemy(before).actions[before.action]!.name}: ${before.enemy.hush ? getEnemy(before).actions[before.action]!.text.split(" Trait — ")[0] : getEnemy(before).actions[before.action]!.text}`
                : after.message);
        setFeedback({ revision: result.snapshot.revision, text });
      } else setFeedback(null);
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
  const handMove =
    selectedName === "Funnel"
      ? "top"
      : selectedCard
        ? face(selectedCard).ops?.find((op) => op.op === "hand-library")?.position
        : undefined;
  const maxTargets = s.pending ? s.pending.required : 1;
  const unavailable = selectedCard ? cardRestriction(s, selectedCard) : "";
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
    <section
      className={`battle-screen${s.phase === "battle" ? " battle-screen--active" : s.phase === "reward" ? " battle-screen--reward" : s.phase === "route" ? " battle-screen--route" : s.phase === "victory" || s.phase === "defeat" ? " battle-screen--ending" : ""}`}
      aria-labelledby="battle-title"
    >
      <div className="battle-head">
        <div>
          <p className="battle-eyebrow">Dusk & Dawn · playable preview</p>
          <h1 id="battle-title" ref={titleRef} tabIndex={-1}>
            {s.phase === "battle"
              ? enemy.name
              : s.phase === "reward"
                ? "Rewards"
                : s.phase === "rest"
                  ? "A moment of rest"
                  : s.phase === "route"
                    ? "Choose a path"
                    : s.phase === "victory"
                      ? "Victory"
                      : "Run ended"}
          </h1>
        </div>
        {s.phase !== "battle" && s.phase !== "victory" && s.phase !== "defeat" && (
          <Button onClick={exitBattle}>Main menu</Button>
        )}
      </div>
      <p className="battle-preview">
        Preview rules: Bless and Curse use the provisional flat model (+1/−1 per stack).
      </p>
      <p role="status" aria-live="polite" key={feedback?.revision}>
        {error ||
          (s.phase === "battle" || s.phase === "reward" ? feedback?.text : feedback?.text || s.message)}
      </p>
      {saveError && <p role="alert">The run could not be saved. Play can continue in this session.</p>}
      {s.phase === "battle" && (
        <>
          <div className="battle-board">
            <section
              className="battle-player"
              data-player-hp={s.player.hp}
              data-mana={s.mana}
              data-ward={s.player.ward}
              aria-label="Player resources"
            >
              <div className="battle-resource battle-resource--health">
                <p>
                  HP {s.player.hp}/{s.player.maxHp}
                </p>
                <span
                  className="battle-pile battle-pile--draw"
                  role="img"
                  aria-label={`Library ${s.zones.library.length}`}
                >
                  <span>{s.zones.library.length}</span>
                </span>
                {statuses(s.player) !== "None" && (
                  <p className="battle-resource-status">{statuses(s.player)}</p>
                )}
                {s.zones.scry && (
                  <p className="battle-resource-status">Scry: {top ? face(top).name : "library empty"}</p>
                )}
              </div>
              <div className="battle-resource battle-resource--mana">
                <p>Mana {s.mana}/3</p>
                <span
                  className="battle-pile battle-pile--discard"
                  role="img"
                  aria-label={`Discard ${s.zones.discard.length} · Banished ${s.zones.banished.length}`}
                >
                  <span>{s.zones.discard.length}</span>
                </span>
              </div>
            </section>
            <section className="battle-enemy" data-enemy-burn={s.enemy.burn} data-enemy-curse={s.enemy.curse}>
              <EnemyPortrait name={enemy.name} hp={s.enemy.hp} maxHp={s.enemy.maxHp}>
                <strong>{enemy.name}</strong>
                <p>
                  HP {s.enemy.hp}/{s.enemy.maxHp} · Weakness: {enemy.weakness} (+2 on first matching hit)
                </p>
                <p>Statuses: {statuses(s.enemy)}</p>
                <p>
                  <strong>Next: {action.name}</strong> —{" "}
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
                    {action.hit}; Bless {s.enemy.bless}, Curse {s.enemy.curse}).
                  </p>
                )}
                {!s.enemy.hush &&
                  !s.enemy.freeze &&
                  action.effects?.some((effect) =>
                    ["move_held", "flip_held", "turn_held"].includes(effect.op),
                  ) && (
                    <p>
                      Held-card hazard pool if you end turn now:{" "}
                      {s.zones.hand
                        .filter((card) => card.kept)
                        .map((card) => face(card).name)
                        .join(", ") || "none"}
                      . Unkept cards are discarded before the enemy acts.
                    </p>
                  )}
                <p>
                  Trait: {enemy.trait} — {enemy.traitEffect}
                </p>
                <p>Pattern: {enemy.actions.map((a) => `${a.name}: ${a.text}`).join(" → ")}</p>
              </EnemyPortrait>
              <h2>
                {enemy.name} · {s.enemy.hp}/{s.enemy.maxHp}
              </h2>
              <p className="battle-intent">
                {s.enemy.freeze || (s.enemy.hush && action.ability)
                  ? "Skipped"
                  : enemyHits
                    ? `${enemyHits.join(" + ")} ${action.type}`
                    : action.text}
              </p>
              {statuses(s.enemy) !== "None" && <p className="battle-enemy-status">{statuses(s.enemy)}</p>}
            </section>
          </div>
          <section className="battle-hand-stage" aria-labelledby="hand-title">
            <h2 id="hand-title" className="visually-hidden">
              Your hand
            </h2>
            <div className="battle-hand" ref={handRef}>
              {s.zones.hand.map((card, index) => (
                <BattleCard
                  key={card.id}
                  card={card}
                  selected={selected === card.id}
                  disabled={!!s.pending}
                  exhausted={s.mana === 0}
                  angle={(index - (s.zones.hand.length - 1) / 2) * 2.5}
                  drop={Math.abs(index - (s.zones.hand.length - 1) / 2) * 3}
                  preview={cardPreview(s, card)}
                  onSelect={(event) => {
                    const name = face(card).name;
                    const choices =
                      name === "Memory"
                        ? s.zones.discard
                        : name === "Sacrifice"
                          ? s.zones.hand.filter((other) => other.id !== card.id)
                          : [];
                    if (choices.length > 1 && s.mana > 0 && !cardRestriction(s, card)) {
                      setSelected(card.id);
                      setTargets([]);
                      setError("");
                    } else {
                      if (event.detail === 0)
                        focusAfterPlay.current = s.zones.hand.findIndex((other) => other.id === card.id);
                      dispatch({ type: "play", id: card.id });
                    }
                  }}
                />
              ))}
            </div>
          </section>
          {s.pending && (
            <section
              id="committed-inspection"
              ref={pendingRef}
              tabIndex={-1}
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
              ref={choiceRef}
              tabIndex={-1}
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
              {handMove && (
                <p>
                  Hand to library {handMove} (draw order within moved cards):{" "}
                  {s.zones.hand
                    .filter((card) => card.id !== selected)
                    .map((card) => face(card).name)
                    .join(", ") || "none"}
                  . Keep markers on moved cards are cleared.
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
                          onClick={(event) => {
                            if (event.detail === 0)
                              focusAfterPlay.current = s.zones.hand.findIndex(
                                (other) => other.id === selectedCard.id,
                              );
                            dispatch({ type: "play", id: selectedCard.id, targets: [card.id] });
                          }}
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
          <div className="battle-actions" ref={actionRef} role="group" aria-label="Battle actions">
            {s.pending ? (
              <a href="#committed-inspection">Choose cards</a>
            ) : selectedCard ? (
              <>
                <span className="battle-actions__selection">
                  {face(selectedCard).name}
                  {needsTarget && !targets.length ? " · choose a target" : ""}
                </span>
                <a href="#selected-card-details">Choose target</a>
                <Button onClick={() => setSelected(null)}>Cancel</Button>
              </>
            ) : null}
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
        <div className="battle-rewards" style={{ "--offers": s.offers.length } as React.CSSProperties}>
          {s.offers.map((pair) => (
            <RewardCard key={pair} pair={pair} onChoose={() => dispatch({ type: "reward", pair })} />
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
            <section className="battle-route" aria-label="Route choices">
              <RouteChoice
                label={`Combat: ${enemy.name} · ${enemy.hp} HP · weakness ${enemy.weakness} · extra reward`}
                caption="Combat · Extra reward"
                onChoose={() => dispatch({ type: "route", choice: "combat" })}
                art={
                  <span className="battle-route-art">
                    <img src={art("enemy", enemy.name)} alt="" />
                  </span>
                }
              >
                <strong>{enemy.name}</strong>
                <p>
                  HP {enemy.hp} · Weakness: {enemy.weakness} · Extra reward
                </p>
                <p>
                  {enemy.trait}: {enemy.traitEffect}
                </p>
                <p>Pattern: {enemy.actions.map((action) => `${action.name}: ${action.text}`).join(" → ")}</p>
              </RouteChoice>
              <RouteChoice
                label="Rest: heal 4 HP"
                caption="Rest · +4 HP"
                onChoose={() => dispatch({ type: "route", choice: "rest" })}
                art={
                  <span className="battle-route-art">
                    <img src={art("card", "Cloister Garden")} alt="" />
                  </span>
                }
              >
                <strong>Rest</strong>
                <p>Heal 4 HP.</p>
              </RouteChoice>
              <RouteChoice
                label={`Event: lose 4 HP, add ${path.pair}`}
                caption="Event · −4 HP"
                disabled={s.player.hp <= 4}
                onChoose={() => dispatch({ type: "route", choice: "event" })}
                art={
                  <span className="battle-route-art battle-route-art--pair">
                    <img src={art("card", cards[path.pair]!.light.name)} alt="" />
                    <img src={art("card", cards[path.pair]!.dark.name)} alt="" />
                  </span>
                }
              >
                <strong>{cards[path.pair]!.light.name}</strong>
                <p>{cards[path.pair]!.light.effect}</p>
                <strong>{cards[path.pair]!.dark.name}</strong>
                <p>{cards[path.pair]!.dark.effect}</p>
              </RouteChoice>
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
        <section className="battle-ending">
          <img src={art("enemy", enemy.name)} alt="" />
          <p>
            Encounters {s.fight + 1}/{route.length} · Deck {s.deck.length}
          </p>
          <Button onClick={exitBattle}>Return to main menu</Button>
        </section>
      )}
    </section>
  );
}
