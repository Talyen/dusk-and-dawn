import { relicIds, relics, type RelicId } from "../../lib/game/relics";
import { expeditionEvent } from "../../lib/game/expedition-events";
import { simpleEnemies } from "../../lib/game/simple-enemies.generated";
import { heroes, heroIds, heroPassive, heroDeckDescription, type HeroId } from "../../lib/game/heroes";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  cards,
  cardCanBanishItself,
  cardRestriction,
  createRun,
  enemyAttackHits,
  face,
  getEnemy,
  route,
  seraphGrantsWard,
  vampireDamage,
  type Command,
  type RunState,
} from "../../lib/game/run";
import { scryTop, type FightCard } from "../../lib/game/card-zones";
import { attackValues, type DamageType } from "../../lib/game/combat-status";
import { encodeRun, readRunWithRecovery, resumeRun } from "../../lib/game/run-save";
import { readProgression, recordExpedition, unlockTier, type Progression } from "../../lib/game/progression";
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
  Burn: "Keep the higher amount on reapplication. At end turn, deal this much Fire damage, then halve Burn, rounding down.",
  Poison:
    "Keep the higher amount on reapplication. At end turn, deal this much Decay damage, then halve Poison, rounding down.",
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
function InspectionTrigger({
  label,
  text,
  className,
  placement,
  children,
}: {
  label: string;
  text: string;
  className: string;
  placement: "top" | "right";
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
  const dismiss = () => {
    pointer.current = false;
    focus.current = false;
    pinned.current = false;
    setOpen(false);
  };
  useEffect(() => {
    const outside = (event: Event) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) dismiss();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside, true);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside, true);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("blur", dismiss);
    };
  }, []);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`battle-status-trigger ${className}`}
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onPointerDown={touch.onPointerDown}
        onPointerMove={touch.onPointerMove}
        onPointerUp={touch.onPointerUp}
        onPointerCancel={touch.onPointerCancel}
        onContextMenu={touch.onContextMenu}
        onClick={() => {
          if (touch.wasTouch()) touch.consumeClick();
          pinned.current = true;
          setOpen(true);
        }}
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
        onBlur={(event) => {
          focus.current = false;
          if (event.relatedTarget instanceof HTMLElement || (!pointer.current && !pinned.current)) dismiss();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            dismiss();
          }
        }}
      >
        {text}
      </button>
      <Tooltip
        triggerRef={trigger}
        id={id}
        open={open}
        placement={placement}
        overlayNarrow
        avoidSelector=".battle-hand-stage"
        className="battle-tooltip battle-status-tooltip"
      >
        {children}
      </Tooltip>
    </>
  );
}
function HeroHealth({ state }: { state: RunState }) {
  const hero = state.hero;
  const relic = state.experiment?.relic;
  const health = `HP ${state.player.hp}/${state.player.maxHp}`;
  if (!hero && (!relic || relic === "none")) return <>{health}</>;
  return (
    <InspectionTrigger
      label={`${hero ? heroes[hero].name : "Player"}, ${health}`}
      text={health}
      className="battle-hero-resource"
      placement="top"
    >
      {hero && (
        <>
          <strong>{heroes[hero].name}</strong>
          <p>{heroPassive(hero, state.heroRuleset)}</p>
        </>
      )}
      {relic && relic !== "none" && (
        <>
          <strong>{relics[relic].name}</strong>
          <p>
            <Description
              text={
                relic === "cracked-vessel" && state.player.maxHp === 30
                  ? "Started at 24 HP with an extra pair."
                  : relics[relic].effect
              }
            />
          </p>
        </>
      )}
    </InspectionTrigger>
  );
}

function StatusDisplay({ holder, side }: { holder: RunState["player"]; side: "player" | "enemy" }) {
  const effects = (["Ward", "Burn", "Poison", "Bless", "Curse", "Reflect", "Hush", "Freeze"] as const).filter(
    (name) => holder[name.toLowerCase() as Lowercase<typeof name>],
  );
  return (
    <InspectionTrigger
      label={`${side === "player" ? "Player" : "Enemy"} status: ${statuses(holder)}`}
      text={statuses(holder)}
      className={side === "player" ? "battle-resource-status" : "battle-enemy-status"}
      placement={side === "player" ? "top" : "right"}
    >
      {effects.map((name) => (
        <p key={name}>
          <strong>{name}</strong> {keywordHelp[name]}
        </p>
      ))}
      {holder.nextDrawPenalty > 0 && (
        <p>
          <strong>Next draw −{holder.nextDrawPenalty}</strong> Fewer cards drawn at the start of your next
          turn.
        </p>
      )}
      {holder.nextManaPenalty > 0 && (
        <p>
          <strong>Next mana −{holder.nextManaPenalty}</strong> Less mana at the start of your next turn.
        </p>
      )}
    </InspectionTrigger>
  );
}
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
          if (exhausted) {
            touchPinned.current = true;
            setOpen(true);
          } else onSelect(event);
        }}
      >
        <img className="battle-card-art" src={art("card", info.name)} alt="" />
        <span className="battle-card-description">
          <strong>{info.name}</strong> {card.face} · {card.kept ? "Kept · " : ""}1 mana. {info.effect}
        </span>
      </button>
      <Tooltip
        triggerRef={trigger}
        id={id}
        open={open}
        avoidRegions=".battle-enemy, .battle-hand-stage, .battle-actions"
        className="battle-tooltip battle-card-tooltip"
      >
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

// Generated action descriptions can repeat the complete trait already shown above
// the pattern. Keep any annotation that contains information not in the trait.
function enemyPattern(enemy: ReturnType<typeof getEnemy>) {
  return enemy.actions
    .map((action) => {
      const marker = " Trait — ";
      const offset = action.text.indexOf(marker);
      const annotation = offset < 0 ? "" : action.text.slice(offset + marker.length);
      const colon = annotation.indexOf(": ");
      const redundant = colon >= 0 && enemy.traitEffect.includes(annotation.slice(colon + 2));
      return `${action.name}: ${redundant ? action.text.slice(0, offset) : action.text}`;
    })
    .join(" → ");
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
  }, []);
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
        onClick={() => {
          if (touch.wasTouch()) {
            touch.consumeClick();
            touchPinned.current = true;
            setOpen(true);
          }
        }}
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
        onBlur={(event) => {
          focus.current = false;
          if (event.relatedTarget instanceof HTMLElement || (!pointer.current && !touchPinned.current)) {
            pointer.current = false;
            touchPinned.current = false;
            setOpen(false);
          }
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

function RewardCard({
  pair,
  onChoose,
  removing = false,
  inspecting = false,
  count,
  exchangeFor,
}: {
  pair: string;
  onChoose: (event: React.MouseEvent<HTMLButtonElement>) => void;
  removing?: boolean;
  inspecting?: boolean;
  count?: number;
  exchangeFor?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pointer = useRef(false);
  const focus = useRef(false);
  const [open, setOpen] = useState(false);
  const touchPinned = useRef(false);
  const inspect = () => {
    document.dispatchEvent(new CustomEvent("dusk-reward-inspection", { detail: trigger.current }));
    setOpen(true);
  };
  const touch = useTouchInspection<HTMLButtonElement>(() => {
    touchPinned.current = true;
    inspect();
  });
  useEffect(() => {
    if (!open) return;
    const dismiss = () => {
      pointer.current = false;
      focus.current = false;
      touchPinned.current = false;
      setOpen(false);
    };
    const outside = (event: Event) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) dismiss();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside, true);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside, true);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("blur", dismiss);
    };
  }, [open]);
  useEffect(() => {
    const closeForAnother = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== trigger.current) {
        pointer.current = false;
        focus.current = false;
        touchPinned.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("dusk-reward-inspection", closeForAnother);
    return () => document.removeEventListener("dusk-reward-inspection", closeForAnother);
  }, []);
  const light = cards[pair]!.light;
  const dark = cards[pair]!.dark;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`battle-reward${removing ? " battle-rest-card" : ""}`}
        onClick={(event) => {
          if (touch.consumeClick()) {
            event.preventDefault();
            return;
          }
          if (inspecting) {
            touchPinned.current = true;
            inspect();
          } else onChoose(event);
        }}
        aria-label={`${exchangeFor ? `Exchange ${pair} for ${exchangeFor}` : `${removing ? "Remove " : ""}${pair}`}${inspecting && count !== undefined ? `, ${count} ${count === 1 ? "copy" : "copies"}` : ""}. ${light.name}: ${light.effect} ${dark.name}: ${dark.effect}`}
        aria-describedby={open ? id : undefined}
        onPointerDown={touch.onPointerDown}
        onPointerMove={touch.onPointerMove}
        onPointerUp={touch.onPointerUp}
        onPointerCancel={touch.onPointerCancel}
        onContextMenu={touch.onContextMenu}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = true;
            inspect();
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
            inspect();
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
  className,
  pressed,
  inspectOnSelect = false,
  placement = "bottom",
}: {
  label: string;
  caption: string;
  disabled?: boolean;
  onChoose: (event: React.MouseEvent<HTMLButtonElement>) => void;
  art: ReactNode;
  children: ReactNode;
  className?: string;
  pressed?: boolean | undefined;
  inspectOnSelect?: boolean;
  placement?: "top" | "bottom";
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
        className={`battle-route-choice${className ? ` ${className}` : ""}`}
        aria-label={label}
        aria-pressed={pressed}
        aria-describedby={open ? id : undefined}
        aria-disabled={disabled || undefined}
        onClick={(event) => {
          if (touch.consumeClick() || disabled) event.preventDefault();
          else {
            onChoose(event);
            if (inspectOnSelect && touch.wasTouch()) {
              pinned.current = true;
              setOpen(true);
            }
          }
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
        {caption && <span>{caption}</span>}
      </button>
      <Tooltip
        triggerRef={trigger}
        id={id}
        open={open}
        placement={placement}
        overlayNarrow
        avoidRegions=".battle-route-deck"
        className="battle-tooltip"
      >
        {children}
      </Tooltip>
    </>
  );
}

function PileCard({
  card,
  position,
  libraryCount,
}: {
  card: FightCard;
  position?: string;
  libraryCount?: number;
}) {
  const trigger = useRef<HTMLDivElement>(null);
  const id = useId();
  const pointer = useRef(false);
  const focus = useRef(false);
  const pinned = useRef(false);
  const [open, setOpen] = useState(false);
  const info = face(card);
  const other = cards[card.pair]![card.face === "light" ? "dark" : "light"];
  const touch = useTouchInspection<HTMLDivElement>(() => {
    pinned.current = true;
    setOpen(true);
  });
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) {
        pointer.current = false;
        focus.current = false;
        pinned.current = false;
        setOpen(false);
      }
    };
    const dismiss = () => {
      pointer.current = false;
      focus.current = false;
      pinned.current = false;
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside, true);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside, true);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("blur", dismiss);
    };
  }, [open]);
  return (
    <div className={`battle-pile-item${libraryCount !== undefined ? " battle-pile-item--scry" : ""}`}>
      <div
        ref={trigger}
        role="img"
        tabIndex={0}
        className="battle-pile-card"
        aria-label={`${libraryCount !== undefined ? `Library ${libraryCount}. Scry. ` : ""}${position ? `${position}. ` : ""}${info.name} ${card.face}. ${info.effect}`}
        aria-describedby={open ? id : undefined}
        onPointerDown={touch.onPointerDown}
        onPointerMove={touch.onPointerMove}
        onPointerUp={touch.onPointerUp}
        onPointerCancel={touch.onPointerCancel}
        onContextMenu={touch.onContextMenu}
        onClick={() => {
          if (touch.wasTouch()) {
            touch.consumeClick();
            pinned.current = true;
            setOpen(true);
          }
        }}
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
        <img src={art("card", info.name)} alt="" />
      </div>
      {libraryCount !== undefined ? (
        <span className="battle-scry-count" aria-hidden="true">
          {libraryCount}
        </span>
      ) : position ? (
        <span className="battle-pile-position" aria-hidden="true">
          {position}
        </span>
      ) : null}
      <Tooltip
        triggerRef={trigger}
        id={id}
        open={open}
        overlayNarrow
        verticalOnly={libraryCount !== undefined}
        {...(libraryCount !== undefined ? { avoidSelector: ".battle-hand-stage" } : {})}
        className={`battle-tooltip${libraryCount !== undefined ? " battle-scry-tooltip" : ""}`}
      >
        <strong>{info.name}</strong>
        <p>
          <Description text={info.effect} />
        </p>
        <p>
          Other face: <strong>{other.name}</strong> — <Description text={other.effect} />
        </p>
        {info.keywords
          .filter((keyword) => keywordHelp[keyword])
          .map((keyword) => (
            <p key={keyword}>
              <strong>{keyword}</strong> {keywordHelp[keyword]}
            </p>
          ))}
      </Tooltip>
    </div>
  );
}

function DeckContents({ deck }: { deck: RunState["deck"] }) {
  const counts = new Map<string, number>();
  for (const card of deck) counts.set(card.pair, (counts.get(card.pair) ?? 0) + 1);
  return (
    <div className="battle-pile-grid battle-deck-grid">
      {[...counts].map(([pair, count]) => (
        <div className="battle-deck-pair" key={pair}>
          <RewardCard pair={pair} inspecting count={count} onChoose={() => {}} />
          <span aria-hidden="true">×{count}</span>
        </div>
      ))}
    </div>
  );
}

function PileBrowser({
  discard,
  banished,
  deck,
  betweenFights,
  onClose,
}: {
  discard: FightCard[];
  banished: FightCard[];
  deck: RunState["deck"];
  betweenFights: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<"discard" | "banished" | "deck">(betweenFights ? "deck" : "discard");
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);
  const visible = view === "discard" ? [...discard].reverse() : banished;
  return (
    <div
      className="battle-pile-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="battle-pile-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (event.key !== "Tab") return;
          const items = [
            ...(dialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), [role="img"][tabindex="0"]',
            ) ?? []),
          ];
          if (!items.length) return;
          const first = items[0]!;
          const last = items[items.length - 1]!;
          if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === dialogRef.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="battle-pile-dialog__head">
          <h2 id={titleId}>
            {view === "discard" ? "Discard" : view === "banished" ? "Banished" : `Deck · ${deck.length}`}
          </h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        {!betweenFights && (
          <div className="battle-pile-tabs" role="group" aria-label="Card piles">
            <Button variant="outline" aria-pressed={view === "discard"} onClick={() => setView("discard")}>
              Discard {discard.length}
            </Button>
            <Button variant="outline" aria-pressed={view === "banished"} onClick={() => setView("banished")}>
              Banished {banished.length}
            </Button>
            <Button variant="outline" aria-pressed={view === "deck"} onClick={() => setView("deck")}>
              Deck {deck.length}
            </Button>
          </div>
        )}
        {view === "deck" ? (
          <DeckContents deck={deck} />
        ) : visible.length ? (
          <div className="battle-pile-grid">
            {visible.map((card, index) => (
              <PileCard
                key={card.id}
                card={card}
                {...(view === "discard"
                  ? {
                      position:
                        visible.length === 1
                          ? "Top · Bottom"
                          : index === 0
                            ? "Top"
                            : index === visible.length - 1
                              ? "Bottom"
                              : "",
                    }
                  : {})}
              />
            ))}
          </div>
        ) : (
          <p className="battle-pile-empty">Empty</p>
        )}
      </section>
    </div>
  );
}

const directCardAttacks: Record<string, { hits: number[]; type: DamageType }> = {
  Sacrifice: { hits: [8], type: "Radiance" },
  Vampire: { hits: [vampireDamage], type: "Shadow" },
  Sun: { hits: [6], type: "Radiance" },
  Wither: { hits: [7], type: "Decay" },
  Thorns: { hits: [2, 2], type: "Decay" },
  "Shattered Mirror": { hits: [2, 2], type: "Release" },
  Ash: { hits: [7], type: "Decay" },
  Oblivion: { hits: [7], type: "Oblivion" },
};

function summarizeChanges(changes: string[]): string {
  const counts = new Map<string, number>();
  for (const change of changes) counts.set(change, (counts.get(change) ?? 0) + 1);
  return [...counts].map(([change, count]) => `${change}${count > 1 ? ` ×${count}` : ""}`).join("; ");
}

function cardPreview(s: RunState, card: FightCard): ReactNode {
  const info = face(card);
  const ops = info.ops ?? [];
  const hand = s.zones.hand.filter((other) => other.id !== card.id);
  const flipped = hand.map((other) => {
    const next = cards[other.pair]![other.face === "light" ? "dark" : "light"];
    return `${face(other).name} → ${next.name}`;
  });
  const flipSummary = summarizeChanges(flipped);
  const lines: string[] = [];
  if (seraphGrantsWard(s, card)) lines.push("On play: gain 1 Ward before this effect.");
  if (s.hero === "thorn-witch" && card.face === "dark")
    lines.push(
      s.heroRuleset !== undefined
        ? "On play: apply 1 Curse before this effect."
        : "On play: apply 2 Poison before this effect.",
    );
  if (s.experiment?.relic === "ashen-seal" && cardCanBanishItself(card))
    lines.push("Ashen Seal: gain 2 Ward after this card Banishes itself.");
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
    lines.push(`Flip preview: ${flipSummary || "no other cards in hand"}.`);
    if (info.name === "Key" || ops.some((op) => op.op === "draw")) {
      const revealed = scryTop(s.zones);
      if (revealed) {
        const other = cards[revealed.pair]![revealed.face === "light" ? "dark" : "light"];
        lines.push(`Draw and Flip: ${face(revealed).name} → ${other.name}.`);
      } else if (!s.zones.library.length && !s.zones.discard.length) {
        lines.push("No card will be drawn.");
      } else {
        lines.push("Any card drawn first will also flip; its identity is not revealed yet.");
      }
    }
  }
  const turnHand = ops.find((op) => op.op === "turn-hand");
  const turnFace = info.name === "Extinguished Candle" ? "dark" : turnHand?.face;
  if (turnFace) {
    const changed = summarizeChanges(
      hand
        .filter((other) => other.face !== turnFace)
        .map((other) => `${face(other).name} → ${cards[other.pair]![turnFace].name}`),
    );
    lines.push(
      `${turnFace === "light" ? "Light" : "Dark"} face preview: ${changed || "no other cards change"}.`,
    );
    const turnIndex = ops.findIndex((op) => op.op === "turn-hand");
    if (ops.slice(0, turnIndex).some((op) => op.op === "draw")) {
      const revealed = scryTop(s.zones);
      if (revealed) {
        const target = cards[revealed.pair]![turnFace].name;
        lines.push(
          revealed.face === turnFace
            ? `Draw and turn: ${target} remains ${turnFace}.`
            : `Draw and turn: ${face(revealed).name} → ${target}.`,
        );
      } else if (!s.zones.library.length && !s.zones.discard.length) {
        lines.push("No card will be drawn.");
      } else {
        lines.push(`Any card drawn first will also turn ${turnFace}; its identity is not revealed yet.`);
      }
    }
  }
  if (ops.some((op) => op.op === "flip-random"))
    lines.push(
      `Random Flip eligible cards: ${flipSummary || "none"}. The random selection happens after play.`,
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
  if (s.mana === 0) lines.push("Not enough mana.");
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
  const { t } = useTranslation();
  const [backend] = useState(saveBackend);
  const [loaded, setLoaded] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [hero, setHero] = useState<HeroId>("oathless-seraph");
  const [orientation, setOrientation] = useState<"light" | "dark">("light");
  const [relic, setRelic] = useState<RelicId>("none");
  const [progress, setProgress] = useState(() => {
    try {
      return readProgression(window.localStorage);
    } catch {
      return readProgression(null);
    }
  });
  const tier = unlockTier(progress);
  const [progressError, setProgressError] = useState(false);
  const [saved, setSaved] = useState<{ snapshot: Snapshot<RunState>; recovered: boolean } | null>(null);
  const [game, setGame] = useState<{
    session: ReturnType<typeof createRun>;
    isNew: boolean;
    recovered: boolean;
    focusOnStart?: boolean;
  } | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const startExpedition = () => {
    setGame({
      session: createRun(
        Math.floor(Math.random() * 0x100000000),
        { id: crypto.randomUUID(), tier, orientation, relic },
        hero,
      ),
      isNew: true,
      recovered: false,
    });
  };
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
        <div className="battle-hero-choices" role="group" aria-label="Antiheroes">
          {heroIds.map((id) => {
            const choice = heroes[id];
            return (
              <RouteChoice
                key={id}
                className="battle-hero-choice"
                label={`${choice.name}. ${choice.passive} Starting deck: ${heroDeckDescription(id)}`}
                caption={choice.name.replace(/^The /, "")}
                pressed={hero === id}
                inspectOnSelect
                onChoose={() => setHero(id)}
                art={
                  <span className="battle-hero-art">
                    <img src={`${import.meta.env.BASE_URL}assets/${choice.art}`} alt="" />
                  </span>
                }
              >
                <strong>{choice.name}</strong>
                <p>{choice.passive}</p>
                <p>Starting deck: {heroDeckDescription(id)}</p>
              </RouteChoice>
            );
          })}
        </div>
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
          {!configuring && <Button onClick={startExpedition}>{t("startExpedition")}</Button>}
          <Button onClick={() => setConfiguring(!configuring)}>
            {configuring ? "Hide expedition options" : "Configure expedition"}
          </Button>
        </div>
        {configuring && (
          <section className="battle-expedition" aria-label="Expedition options">
            <div className="battle-expedition__art" data-orientation={orientation} aria-hidden="true">
              <img src={art("card", "Sun")} alt="" />
              <img src={art("card", "Moon")} alt="" />
            </div>
            <div className="battle-expedition__controls">
              <h2>Expedition</h2>
              <p>Pool tier {tier}/3</p>
              <div className="battle-setup__fields">
                <label>
                  Starting orientation
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
                  Run relic
                  <select value={relic} onChange={(event) => setRelic(event.target.value as typeof relic)}>
                    {relicIds.map((id) => (
                      <option value={id} key={id}>
                        {relics[id].name}
                        {relics[id].effect ? ` · ${relics[id].effect}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="battle-setup__actions">
                <Button onClick={startExpedition}>{t("startExpedition")}</Button>
                <Button
                  onClick={() =>
                    setGame({
                      session: createRun(Math.floor(Math.random() * 0x100000000), undefined, hero),
                      isNew: true,
                      recovered: false,
                    })
                  }
                >
                  {t("startClassicRun")}
                </Button>
              </div>
            </div>
          </section>
        )}
        <Button onClick={onExit}>Main menu</Button>
      </section>
    );
  return (
    <BattleSession
      key={sessionKey}
      game={game.session}
      isNew={game.isNew}
      focusOnStart={game.focusOnStart ?? false}
      recovered={game.recovered}
      backend={backend}
      onExit={onExit}
      onReplay={(previous) => {
        const experiment = previous.experiment
          ? {
              id: crypto.randomUUID(),
              tier: unlockTier(progress),
              orientation: previous.experiment.orientation,
              relic: previous.experiment.relic,
            }
          : undefined;
        setGame({
          session: createRun(Math.floor(Math.random() * 0x100000000), experiment, previous.hero),
          isNew: true,
          recovered: false,
          focusOnStart: true,
        });
        setSessionKey((key) => key + 1);
      }}
      onDiscover={onDiscover}
      progress={progress}
      progressError={progressError}
      onComplete={(id) => {
        try {
          const updated = recordExpedition(window.localStorage, id);
          setProgress(updated);
          setProgressError(!updated.completed.includes(id));
        } catch {
          setProgressError(true);
        }
      }}
    />
  );
}

function BattleSession({
  game,
  isNew,
  focusOnStart,
  recovered,
  backend,
  onExit,
  onReplay,
  onDiscover,
  progress,
  progressError,
  onComplete,
}: {
  game: ReturnType<typeof createRun>;
  isNew: boolean;
  focusOnStart: boolean;
  recovered: boolean;
  backend: SaveBackend;
  onExit: () => void;
  onReplay: (state: RunState) => void;
  onDiscover: (ids: readonly string[]) => void;
  progress: Progression;
  progressError: boolean;
  onComplete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState(game.getSnapshot);
  const [feedback, setFeedback] = useState<{ revision: number; text: string } | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  const handRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnStart) titleRef.current?.focus();
  }, [focusOnStart]);
  const pendingRef = useRef<HTMLElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const focusAfterPlay = useRef<number | null>(null);
  const restDeckRef = useRef<HTMLDivElement>(null);
  const focusAfterRest = useRef<number | null>(null);
  const focusAfterExchange = useRef(false);
  useEffect(() => {
    if (focusAfterExchange.current) {
      focusAfterExchange.current = false;
      titleRef.current?.focus();
    }
  }, [snapshot]);
  useEffect(() => {
    const index = focusAfterRest.current;
    if (index === null) return;
    focusAfterRest.current = null;
    const buttons = restDeckRef.current?.querySelectorAll<HTMLButtonElement>("button");
    (buttons?.[Math.min(index, buttons.length - 1)] ?? titleRef.current)?.focus();
  }, [snapshot]);
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
  const focusAfterCancel = useRef<number | null>(null);
  useEffect(() => {
    if (selected) choiceRef.current?.focus();
    else if (focusAfterCancel.current !== null) {
      const buttons = handRef.current?.querySelectorAll<HTMLButtonElement>(".battle-card:not(:disabled)");
      buttons?.[Math.min(focusAfterCancel.current, buttons.length - 1)]?.focus();
      focusAfterCancel.current = null;
    }
  }, [selected]);
  const [targets, setTargets] = useState<string[]>([]);
  const [pileOpen, setPileOpen] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const leaving = useRef(false);
  const [transitioning, setTransitioning] = useState(false);
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
  function leaveBattle(action: () => void) {
    if (leaving.current) return;
    leaving.current = true;
    setTransitioning(true);
    void writes.current.catch(() => undefined).then(action);
  }
  function exitBattle() {
    leaveBattle(onExit);
  }
  function replayBattle() {
    leaveBattle(() => onReplay(snapshot.state));
  }
  const s = snapshot.state;
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [s.phase, s.experiment?.route?.selecting]);
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
    const routePreview = s.phase === "route" ? s.experiment?.route : undefined;
    const visiblePairs = [
      ...s.deck.map((card) => card.pair),
      ...s.offers,
      ...(routePreview && routePreview.event !== "sanctuary" ? [routePreview.pair] : []),
    ];
    const ids = visiblePairs.flatMap((pair) => [
      `card:${cards[pair]!.light.name}`,
      `card:${cards[pair]!.dark.name}`,
    ]);
    const enemy = getEnemy(s);
    const enemyEntry = simpleEnemies.find((entry) => entry.name === enemy.name);
    if (enemyEntry) ids.push(`enemy:${enemyEntry.id}`);
    if (routePreview && !routePreview.selecting) ids.push(`enemy:${routePreview.enemy}`);
    onDiscover(ids);
  }, [snapshot, onDiscover]);
  function dispatch(command: Command) {
    const result = game.dispatch(command);
    if (!result.decision.accepted) {
      focusAfterPlay.current = null;
      focusAfterRest.current = null;
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
          changes.push(`Enemy ${signed(after.enemy.hp - before.enemy.hp)} HP`);
        if (after.player.ward !== before.player.ward)
          changes.push(`Ward ${signed(after.player.ward - before.player.ward)}`);
        if (after.enemy.ward !== before.enemy.ward)
          changes.push(`Enemy Ward ${signed(after.enemy.ward - before.enemy.ward)}`);
        for (const name of ["burn", "poison", "curse", "bless"] as const) {
          const label = `${name[0]!.toUpperCase()}${name.slice(1)}`;
          const playerChange = after.player[name] - before.player[name];
          const enemyChange = after.enemy[name] - before.enemy[name];
          const showReduction = name === "curse" || name === "bless";
          if (playerChange > 0 || (showReduction && playerChange < 0))
            changes.push(`You ${label} ${signed(playerChange)}`);
          if (enemyChange > 0 || (showReduction && enemyChange < 0))
            changes.push(`Enemy ${label} ${signed(enemyChange)}`);
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
  const maxTargets = s.pending ? s.pending.required : 1;
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
  const traitWillActivate =
    !s.enemy.hush &&
    (!action.condition ||
      (action.condition === "enemy_has_Burn_after_tick" && Math.floor(s.enemy.burn / 2) > 0));
  const enemyHits =
    action.hit === undefined
      ? null
      : attackValues(
          enemyAttackHits(action, !traitWillActivate, s.latestDirectHit),
          s.enemy.bless,
          s.enemy.curse,
          0,
          "flat-preview",
        );
  const bypass = traitWillActivate
    ? action.effects?.find((effect) => effect.op === "ignore_ward")?.amount
    : undefined;
  const bypassAmount =
    enemyHits && bypass !== undefined
      ? Math.min(enemyHits[0]!, bypass === "all" ? enemyHits[0]! : bypass)
      : 0;
  // An attack can carry a status even when Ward absorbs all of its damage.
  // Show that consequence beside the damage so it can inform card order.
  const statusEffects = traitWillActivate
    ? [
        ...(action.rider === "curse" ? ["Curse 1"] : []),
        ...(action.rider === "poison" ? ["Poison 3"] : []),
        ...(action.effects ?? [])
          .filter(
            (effect) =>
              effect.stage === "after_attack" &&
              ["curse", "poison", "burn"].includes(effect.op) &&
              typeof effect.amount === "number" &&
              effect.amount > 0,
          )
          .map((effect) => `${effect.op[0]!.toUpperCase()}${effect.op.slice(1)} ${effect.amount}`),
      ]
    : [];
  // Some traits react during the player's turn, even if Freeze will skip the next action.
  const reaction = !s.enemy.hush
    ? action.effects?.find((effect) => effect.op === "reaction_damage")
    : undefined;
  const reactionText =
    typeof reaction?.amount === "number" && reaction.amount > 0
      ? `${reaction.amount} ${reaction.damage_type ?? "damage"} after your attacks`
      : undefined;
  const activeActionEffects = traitWillActivate && !s.enemy.freeze ? (action.effects ?? []) : [];
  const nextTurnPenalties = activeActionEffects
    .filter(
      (effect) =>
        effect.stage === "after_attack" &&
        (effect.op === "reduce_next_draw" || effect.op === "reduce_next_mana") &&
        typeof effect.amount === "number" &&
        effect.amount > 0,
    )
    .map((effect) => `next ${effect.op === "reduce_next_draw" ? "draw" : "mana"} −${effect.amount}`);
  const cardMoves = activeActionEffects.flatMap((effect) => {
    if (
      effect.stage !== "after_attack" ||
      (effect.op !== "move_top" && effect.op !== "move_held") ||
      typeof effect.amount !== "number" ||
      effect.amount <= 0 ||
      !effect.to
    )
      return [];
    const destinations: Record<string, string> = {
      player_draw_top: "library top",
      player_draw_bottom: effect.op === "move_top" ? "bottom" : "library bottom",
      player_discard: "discard",
      player_banished: "banished",
    };
    const destination = destinations[effect.to];
    if (!destination) return [];
    const source = effect.op === "move_held" ? `${effect.amount} kept` : `${effect.amount} from library top`;
    return [`up to ${source} → ${destination}`];
  });
  const copiesLastHit = activeActionEffects.some((effect) => effect.op === "copy_latest_hit");
  const nextHandFace = activeActionEffects.find(
    (effect) => effect.op === "turn_after_draw" && effect.stage === "after_attack",
  )?.face;
  const intentText = [
    s.enemy.freeze || (s.enemy.hush && action.ability)
      ? "Skipped"
      : enemyHits
        ? [
            `${enemyHits.join(" + ")} ${action.type}`,
            ...(bypassAmount ? [`${bypassAmount} through Ward`] : []),
            ...statusEffects,
            ...nextTurnPenalties,
            ...cardMoves,
            ...(copiesLastHit ? ["copies your last hit"] : []),
            ...(nextHandFace ? [`next hand ${nextHandFace}`] : []),
          ].join(" · ")
        : action.text,
    ...(reactionText ? [reactionText] : []),
  ].join(" · ");
  const actionDetails = (
    <>
      <p>
        <strong>Next: {action.name}</strong> —{" "}
        {s.enemy.freeze ? (
          "Frozen: this action is skipped."
        ) : s.enemy.hush && action.ability ? (
          "Hushed: this ability is skipped."
        ) : s.enemy.hush ? (
          <>
            <Description text={action.text.split(" Trait — ")[0]!} /> Hushed: the trait is suppressed.
          </>
        ) : (
          <Description text={action.text} />
        )}
      </p>
      {s.enemy.freeze && reactionText && (
        <p>
          Active while Frozen: {reactionText} if the enemy survives. This happens once per direct attack card.
        </p>
      )}
      {enemyHits && !s.enemy.freeze && (
        <p>
          Current attack: {enemyHits.join(" + ")} {action.type} damage before Ward and Reflect (base{" "}
          {action.hit}; Bless {s.enemy.bless}, Curse {s.enemy.curse}).
        </p>
      )}
      {!s.enemy.hush &&
        !s.enemy.freeze &&
        action.effects?.some((effect) => ["move_held", "flip_held", "turn_held"].includes(effect.op)) && (
          <p>
            Held-card hazard pool if you end turn now:{" "}
            {s.zones.hand
              .filter((card) => card.kept)
              .map((card) => face(card).name)
              .join(", ") || "none"}
            . Unkept cards are discarded before the enemy acts.
          </p>
        )}
    </>
  );
  return (
    <section
      className={`battle-screen${s.phase === "battle" ? " battle-screen--active" : s.phase === "reward" ? " battle-screen--reward" : s.phase === "route" ? " battle-screen--route" : s.phase === "rest" ? " battle-screen--rest" : s.phase === "victory" || s.phase === "defeat" ? " battle-screen--ending" : ""}`}
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
                    ? s.experiment?.route?.selecting
                      ? "Mirror Exchange"
                      : "Choose a path"
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
      <p
        role="status"
        aria-live="polite"
        key={feedback?.revision}
        className={error ? "battle-status-error" : undefined}
      >
        {error ||
          (s.phase === "battle" || s.phase === "reward" ? feedback?.text : feedback?.text || s.message)}
      </p>
      {saveError && <p role="alert">The run could not be saved. Play can continue in this session.</p>}
      {(s.phase === "reward" || s.phase === "route") && (
        <div className="battle-decision-health">
          <HeroHealth state={s} />
        </div>
      )}
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
                  <HeroHealth state={s} />
                </p>
                {top ? (
                  <PileCard card={top} libraryCount={s.zones.library.length} />
                ) : (
                  <span
                    className="battle-pile battle-pile--draw"
                    role="img"
                    aria-label={`Library ${s.zones.library.length}${s.zones.scry ? ". Scry: empty" : ""}`}
                  >
                    <span>{s.zones.library.length}</span>
                  </span>
                )}
                {statuses(s.player) !== "None" && <StatusDisplay holder={s.player} side="player" />}
              </div>
              <div className="battle-resource battle-resource--mana">
                <p>Mana {s.mana}/3</p>
                <button
                  type="button"
                  className="battle-pile battle-pile--discard"
                  aria-label={`Discard ${s.zones.discard.length} · Banished ${s.zones.banished.length}`}
                  disabled={!!s.pending || !!selected}
                  onClick={() => setPileOpen(true)}
                >
                  <span>{s.zones.discard.length}</span>
                </button>
              </div>
            </section>
            <section className="battle-enemy" data-enemy-burn={s.enemy.burn} data-enemy-curse={s.enemy.curse}>
              <EnemyPortrait name={enemy.name} hp={s.enemy.hp} maxHp={s.enemy.maxHp}>
                <strong>{enemy.name}</strong>
                <p>
                  HP {s.enemy.hp}/{s.enemy.maxHp} · Weakness: {enemy.weakness} (+2 on first matching hit)
                </p>
                <p>Statuses: {statuses(s.enemy)}</p>
                {actionDetails}
                <p>
                  Trait: {enemy.trait} — {enemy.traitEffect}
                </p>
                <p>Pattern: {enemyPattern(enemy)}</p>
              </EnemyPortrait>
              <h2>
                {enemy.name} · {s.enemy.hp}/{s.enemy.maxHp}
              </h2>
              <InspectionTrigger
                label={`${enemy.name} intent: ${intentText}`}
                text={intentText}
                className="battle-intent"
                placement="right"
              >
                {actionDetails}
              </InspectionTrigger>
              {statuses(s.enemy) !== "None" && <StatusDisplay holder={s.enemy} side="enemy" />}
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
                  disabled={!!s.pending || !!selected}
                  exhausted={s.mana === 0 || !!cardRestriction(s, card)}
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
              className="battle-choice-panel"
              aria-label="Committed inspection"
            >
              <h2>{s.pending.kind === "order" ? "Top to bottom" : `To hand · ${s.pending.required}`}</h2>
              <div className="battle-choice-grid">
                {s.pending.cards.map((card) => (
                  <RouteChoice
                    key={card.id}
                    className="battle-inspection-card"
                    placement="top"
                    label={`${face(card).name} — ${face(card).effect}${s.pending?.kind === "order" && targets.includes(card.id) ? ` · position ${targets.indexOf(card.id) + 1}` : ""}`}
                    caption={
                      s.pending?.kind === "order" && targets.includes(card.id)
                        ? `${targets.indexOf(card.id) + 1}`
                        : ""
                    }
                    pressed={s.pending && s.pending.required > 1 ? targets.includes(card.id) : undefined}
                    onChoose={(event) => {
                      if (s.pending?.required === 1) {
                        if (event.detail === 0) focusAfterPlay.current = 0;
                        dispatch({ type: "choose", ids: [card.id] });
                      } else toggleTarget(card.id);
                    }}
                    art={
                      <span className="battle-choice-art">
                        <img src={art("card", face(card).name)} alt="" />
                      </span>
                    }
                  >
                    <strong>{face(card).name}</strong>
                    <p>
                      <Description text={face(card).effect} />
                    </p>
                    <p>
                      Other face: {cards[card.pair]![card.face === "light" ? "dark" : "light"].name} —{" "}
                      {cards[card.pair]![card.face === "light" ? "dark" : "light"].effect}
                    </p>
                  </RouteChoice>
                ))}
              </div>
              {s.pending.required > 1 && (
                <Button
                  disabled={targets.length !== s.pending.required}
                  onClick={(event) => {
                    if (event.detail === 0) focusAfterPlay.current = 0;
                    dispatch({ type: "choose", ids: targets });
                  }}
                >
                  Confirm choice
                </Button>
              )}
            </section>
          )}
          {selectedCard && !s.pending && (
            <section
              id="selected-card-details"
              ref={choiceRef}
              tabIndex={-1}
              className="battle-choice-panel"
              aria-label="Selected card"
            >
              <h2>{selectedName === "Sacrifice" ? "Banish" : "Return to hand"}</h2>
              <div className="battle-choice-grid">
                {targetZone.map((card) => (
                  <RouteChoice
                    key={card.id}
                    className="battle-inspection-card"
                    placement="top"
                    label={`${face(card).name} — ${face(card).effect}`}
                    caption=""
                    onChoose={(event) => {
                      if (event.detail === 0)
                        focusAfterPlay.current = s.zones.hand.findIndex(
                          (other) => other.id === selectedCard.id,
                        );
                      dispatch({ type: "play", id: selectedCard.id, targets: [card.id] });
                    }}
                    art={
                      <span className="battle-choice-art">
                        <img src={art("card", face(card).name)} alt="" />
                      </span>
                    }
                  >
                    <strong>{face(card).name}</strong>
                    <p>
                      <Description text={face(card).effect} />
                    </p>
                    <p>
                      Other face: {cards[card.pair]![card.face === "light" ? "dark" : "light"].name} —{" "}
                      {cards[card.pair]![card.face === "light" ? "dark" : "light"].effect}
                    </p>
                  </RouteChoice>
                ))}
              </div>
              <Button
                onClick={(event) => {
                  if (event.detail === 0)
                    focusAfterCancel.current = s.zones.hand.findIndex((card) => card.id === selectedCard.id);
                  setSelected(null);
                }}
              >
                Cancel
              </Button>
            </section>
          )}
          <div className="battle-actions" ref={actionRef} role="group" aria-label="Battle actions">
            <Button disabled={!!s.pending || !!selected} onClick={() => dispatch({ type: "end" })}>
              End turn
            </Button>
            <Button disabled={!!s.pending || !!selected} onClick={() => dispatch({ type: "concede" })}>
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
          <div className="battle-reward-actions">
            <Button variant="outline" onClick={() => setPileOpen(true)}>
              Deck {s.deck.length}
            </Button>
            <Button onClick={() => dispatch({ type: "reward", pair: null })}>
              Skip reward
              {s.experiment?.relic === "hollow-chalice" && s.offers.length > 0 && s.player.hp < s.player.maxHp
                ? ` · +${Math.min(3, s.player.maxHp - s.player.hp)} HP`
                : ""}
            </Button>
          </div>
        </div>
      )}
      {s.phase === "route" &&
        s.experiment?.route &&
        (() => {
          const path = s.experiment.route;
          const enemy = simpleEnemies.find((entry) => entry.id === path.enemy)!;
          const event = expeditionEvent(path.event);
          const restHeal = Math.min(4, s.player.maxHp - s.player.hp);
          const sanctuaryHeal = Math.min(7, s.player.maxHp - s.player.hp);
          if (path.selecting)
            return (
              <section className="battle-exchange" aria-label="Mirror Exchange">
                <div className="battle-exchange__offer">
                  <h2>Receive</h2>
                  <RewardCard pair={path.pair} inspecting onChoose={() => {}} />
                  <Button
                    variant="outline"
                    onClick={(event) => {
                      if (event.detail === 0) focusAfterExchange.current = true;
                      dispatch({ type: "exchange", id: null });
                    }}
                  >
                    Back to paths
                  </Button>
                </div>
                <h2>Give</h2>
                <div className="battle-rest__deck">
                  {s.deck.map((card) => (
                    <RewardCard
                      key={card.id}
                      pair={card.pair}
                      removing
                      exchangeFor={path.pair}
                      onChoose={(event) => {
                        if (event.detail === 0) focusAfterPlay.current = 0;
                        dispatch({ type: "exchange", id: card.id });
                      }}
                    />
                  ))}
                </div>
              </section>
            );
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
                <p>Pattern: {enemyPattern(enemy)}</p>
              </RouteChoice>
              <RouteChoice
                label={`Rest: heal ${restHeal} HP`}
                caption={`Rest · +${restHeal} HP`}
                onChoose={() => dispatch({ type: "route", choice: "rest" })}
                art={
                  <span className="battle-route-art">
                    <img src={art("card", "Cloister Garden")} alt="" />
                  </span>
                }
              >
                <strong>Rest</strong>
                <p>Heal {restHeal} HP.</p>
              </RouteChoice>
              <RouteChoice
                label={
                  path.event === "exchange"
                    ? `Event: ${event.label} ${path.pair}`
                    : path.event === "sanctuary"
                      ? `Event: heal ${sanctuaryHeal} HP, start next fight with 2 mana`
                      : `Event: ${event.label}, add ${path.pair}`
                }
                caption={
                  path.event === "sanctuary"
                    ? `${event.name} · +${sanctuaryHeal} HP · −1 mana`
                    : event.caption
                }
                disabled={
                  ((path.event ?? "blood") === "blood" && s.player.hp <= 4) ||
                  (path.event === "exchange" && !s.deck.length)
                }
                onChoose={(click) => {
                  if (click.detail === 0 && path.event === "exchange") focusAfterExchange.current = true;
                  dispatch({ type: "route", choice: "event" });
                }}
                art={
                  path.event === "sanctuary" ? (
                    <span className="battle-route-art">
                      <img src={art("card", "Sunken Shrine")} alt="" />
                    </span>
                  ) : (
                    <span className="battle-route-art battle-route-art--pair">
                      <img src={art("card", cards[path.pair]!.light.name)} alt="" />
                      <img src={art("card", cards[path.pair]!.dark.name)} alt="" />
                    </span>
                  )
                }
              >
                <strong>{event.name}</strong>
                <p>
                  <Description
                    text={
                      path.event === "sanctuary"
                        ? `Heal ${sanctuaryHeal} HP. Start the next fight with 2 mana.`
                        : event.cost
                    }
                  />
                </p>
                {path.event === "thorns" && (
                  <p>
                    <strong>Poison</strong> deals its amount at end turn, then halves.
                  </p>
                )}
                {path.event !== "sanctuary" && (
                  <>
                    <strong>{cards[path.pair]!.light.name}</strong>
                    <p>{cards[path.pair]!.light.effect}</p>
                    <strong>{cards[path.pair]!.dark.name}</strong>
                    <p>{cards[path.pair]!.dark.effect}</p>
                  </>
                )}
              </RouteChoice>
              <Button className="battle-route-deck" variant="outline" onClick={() => setPileOpen(true)}>
                Deck {s.deck.length}
              </Button>
            </section>
          );
        })()}
      {s.phase === "rest" && (
        <section className="battle-rest" aria-label="Rest choices">
          <div className="battle-rest__heal">
            <p>
              <HeroHealth state={s} />
            </p>
            <Button onClick={() => dispatch({ type: "rest" })}>
              {s.experiment?.restRemovals
                ? "Continue without another removal"
                : `Heal ${Math.min(6, s.player.maxHp - s.player.hp)} HP`}
            </Button>
          </div>
          <h2>{s.experiment?.restRemovals ? "Remove another pair" : "Remove a pair"}</h2>
          <div className="battle-rest__deck" ref={restDeckRef}>
            {s.deck.map((card, index) => (
              <RewardCard
                key={card.id}
                pair={card.pair}
                removing
                onChoose={(event) => {
                  if (event.detail === 0) focusAfterRest.current = index;
                  dispatch({ type: "rest", remove: card.id });
                }}
              />
            ))}
          </div>
        </section>
      )}
      {pileOpen && (
        <PileBrowser
          discard={s.zones.discard}
          banished={s.zones.banished}
          deck={s.deck}
          betweenFights={s.phase !== "battle"}
          onClose={() => setPileOpen(false)}
        />
      )}
      {(s.phase === "victory" || s.phase === "defeat") && (
        <section className="battle-ending">
          <img src={art("enemy", enemy.name)} alt="" />
          <p>
            Journey {s.fight + (s.phase === "victory" || s.experiment?.route?.active ? 1 : 0)}/{route.length}
            {" · "}Deck {s.deck.length}
            {" · "}
            <HeroHealth state={s} />
          </p>
          {s.experiment && progress.completed.includes(s.experiment.id) && (
            <p role="status">Expedition pool · tier {unlockTier(progress)}/3 · Nocturne unlocked</p>
          )}
          {progressError && <p role="alert">Expedition progress could not be saved.</p>}
          <div className="battle-ending__actions">
            <Button disabled={transitioning} onClick={replayBattle}>
              {t("playAgain")}
            </Button>
            <Button variant="outline" disabled={transitioning} onClick={() => setPileOpen(true)}>
              View deck
            </Button>
            <Button variant="outline" disabled={transitioning} onClick={exitBattle}>
              Return to main menu
            </Button>
          </div>
        </section>
      )}
    </section>
  );
}
