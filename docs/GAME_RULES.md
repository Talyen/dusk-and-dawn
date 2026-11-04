# Implemented run and combat rules

This is a guide to the prototype's shared behavior, not a complete catalogue of card and enemy exceptions or a final balance specification. The executable owners are `src/lib/game/run.ts`, `card-zones.ts`, `combat-status.ts` and `direct-attack.ts`; tests named below exercise representative boundaries. Compare proposed changes with the [design index](README.md) and [content workflow](CONTENT_WORKFLOWS.md), and update this guide when its behavior changes.

## Run and fight

A run starts at 30 HP with two copies of each of five starter pairs; the Cracked Vessel expedition relic instead starts at 24 HP and adds a card pair. Its five scheduled fights comprise the fixed opening enemy, two sampled regulars, an elite and a boss. HP carries between fights; fight-local statuses and card zones are reset. At each fight start the deck is shuffled into the library, cards start light-side up (or use the expedition orientation), the player receives 3 mana and draws up to 5 cards.

Victory before the last scheduled fight offers up to three unowned card pairs or a skip. After the second scheduled fight, the player may heal 6 HP or remove a deck card. The optional expedition can add a route after the first and third fights: combat for a reward, rest for 4 HP, or an event costing 4 HP for a card pair. The event requires more than 4 HP; routes rejoin before the next scheduled fight. Relics can alter these choices. See `tests/lib/expedition.test.ts` and `tests/lib/run.test.ts`.

## Cards and turn order

Playing a card costs 1 mana. The active face and any required target are checked before payment; the card leaves the hand while its effect resolves. A flip changes the card's face but does not change the effect already being resolved. Kept cards remain in hand at end of turn; other cards are discarded left to right. Banish removes a card from the fight, not the run deck. The hand limit is 8; excess draws remain in the library. The discard pile is shuffled into an empty library only when a draw needs it. Scry exposes the current library top without causing a reshuffle and ends when the turn is ended.

Some inspection effects commit the play and payment before presenting a choice. While that choice is pending, other commands, including concede, are rejected; the choice is part of the saved run. See `tests/lib/card-zones.test.ts`, `inspection.test.ts` and `run-save.test.ts`.

Ending a turn follows this order in `runHandler`:

1. Discard non-kept cards, then tick player Burn, player Poison, enemy Burn and enemy Poison in that order. A defeat stops the sequence immediately.
2. Halve enemy Ward, rounding down; resolve the enemy's current action and applicable traits, unless skipped. Defeat can end the fight before later effects.
3. Clear the enemy's Hush and Freeze, advance its action, halve player Ward, and reset mana and draw up to 5 cards, less any next-turn penalties. The hand limit still applies. Set the next enemy intent.

See `tests/lib/combat-status.test.ts`, `run.test.ts` and `enemy-traits.test.ts` for specific ordering and exceptions.

## Statuses and direct attacks

- **Ward** absorbs damage before HP unless an effect bypasses it. It halves at the relevant turn boundary above.
- **Burn and Poison** retain the higher of an existing and newly applied amount. On a tick, the current amount passes through Ward, then the status halves, rounding down, even if Ward absorbed it.
- **Bless and Curse** use the provisional flat model in live attacks: each hit gains Bless and loses Curse, floored at zero. A matching enemy weakness adds 2 to the first hit before scaling. The attack consumes the attacker's Bless and Curse. `attackValues` also supports a percentage comparison model; it is not the live attack setting.
- **Reflect** redirects one hit to the attacker and is consumed even by a zero-damage hit. **Leech** heals a surviving attacker by the sum of resolved hit amounts, including amounts absorbed by Ward and overkill, capped at maximum HP. Player multi-hit attacks finish their hits after the defender falls; other callers can choose different termination behavior.
- **Hush** suppresses an enemy trait and skips an ability action, but does not suppress a base attack. **Freeze** skips the enemy action; both clear after the enemy phase. Specific enemy effects and card restrictions still apply.
- **Cleanse** removes harmful status kinds; **Purge** removes beneficial kinds. A random single removal chooses uniformly among present kinds, not individual stacks.

For exact hit order and edge cases, use `tests/lib/direct-attack.test.ts` and `combat-status.test.ts`; generated card operations and explicit handlers may add effects around a direct attack. Automated rules coverage and heuristic playthroughs do not establish balance or human difficulty; see [playthroughs](PLAYTHROUGHS.md).
