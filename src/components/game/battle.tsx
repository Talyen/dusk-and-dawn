import { useState } from "react";
import { cards, createRun, face, route, type Command, type RunState } from "../../lib/game/run";
import { scryTop, type FightCard } from "../../lib/game/card-zones";
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
  return result.join(" · ") || "None";
}
export function Battle({ onExit }: { onExit: () => void }) {
  const [game] = useState(() => createRun(Math.floor(Math.random() * 0x100000000)));
  const [snapshot, setSnapshot] = useState(game.getSnapshot);
  const [selected, setSelected] = useState<string | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [error, setError] = useState("");
  const s = snapshot.state;
  function dispatch(command: Command) {
    const result = game.dispatch(command);
    if (!result.decision.accepted) setError(result.decision.reason);
    else {
      setError("");
      setSelected(null);
      setTargets([]);
      setSnapshot(result.snapshot);
    }
  }
  const selectedCard = s.zones.hand.find((c) => c.id === selected);
  const selectedName = selectedCard ? face(selectedCard).name : "";
  const targetZone =
    selectedName === "Ash" || selectedName === "Oblivion"
      ? s.zones.hand.filter((c) => c.id !== selected)
      : selectedName === "Memory" || selectedName === "Seed"
        ? s.zones.discard
        : [];
  const needsTarget = ["Ash", "Oblivion", "Memory", "Seed"].includes(selectedName);
  const maxTargets = selectedName === "Seed" ? 2 : 1;
  const canPlay =
    !!selectedCard && s.mana > 0 && (!needsTarget || selectedName === "Seed" || targets.length === 1);
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
        {s.phase !== "battle" && <Button onClick={onExit}>Main menu</Button>}
      </div>
      <p className="battle-preview">
        Preview rules: Bless and Curse use the provisional flat model (+1/−1 per stack). The wider card and
        enemy catalogues are still in progress.
      </p>
      <p role="status" aria-live="polite">
        {error || s.message}
      </p>
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
                <Description text={enemy.actions[s.action]!.text} />
              </p>
              <p>
                Trait: {enemy.trait}. Pattern: {enemy.actions.map((a) => a.name).join(" → ")}
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
              {needsTarget && (
                <>
                  <p>
                    {selectedName === "Seed"
                      ? "Choose up to two cards from your discard pile."
                      : selectedName === "Memory"
                        ? "Choose a card from your discard pile."
                        : "Choose another card in your hand to Banish."}
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
                {cards[pair].light.name}: {cards[pair].light.effect}
              </span>
              <span>
                {cards[pair].dark.name}: {cards[pair].dark.effect}
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
          <Button onClick={onExit}>Return to main menu</Button>
        </section>
      )}
    </main>
  );
}
