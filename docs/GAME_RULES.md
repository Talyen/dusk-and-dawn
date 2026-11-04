# Implemented run and combat rules

This is a guide to the prototype's shared behavior, not a complete catalogue of card and enemy exceptions or a final balance specification. The executable owners are `src/lib/game/run.ts`, `card-zones.ts`, `combat-status.ts` and `direct-attack.ts`; tests named below exercise representative boundaries. Compare proposed changes with the [design index](README.md) and [content workflow](CONTENT_WORKFLOWS.md), and update this guide when its behavior changes.

## Run and fight

A new run starts at 30 HP with one Angel & Vampire, one class-specific signature pair and two copies of each of four other starting pairs; the Cracked Vessel expedition relic instead starts at 24 maximum HP and adds a card pair. Existing Cracked Vessel saves keep their original 30 HP maximum. Legacy saved runs retain their original deck and have no antihero passive. Its five scheduled fights comprise an opening enemy, two sampled regulars, an elite and a boss. The first expedition and classic runs open against Radiant Moth; higher-tier expeditions select from a small curated opening pool without repeating a scheduled enemy. HP carries between fights; fight-local statuses and card zones are reset. At each fight start the deck is shuffled into the library, cards start light-side up (or use the expedition orientation), the player receives 3 mana and draws up to 5 cards.

Victory before the last scheduled fight offers up to three unowned card pairs or a skip. Rewards and route-event pairs prefer choices absent from the previous reward, with a fallback when few unowned pairs remain; older offers may return later. Within a reward screen, different pairs with identical two-face effects are deferred until needed, so choices usually offer distinct effects without permanently excluding alternate artwork. After the second scheduled fight, the player may heal 6 HP or remove a deck card. The expedition can add a route after the first and third fights: combat for a reward, rest for 4 HP, or an event that offers a shown pair: pay 4 HP, begin the next fight with 4 Poison, begin it with one less opening mana, or exchange one physical card from the deck for the offered pair. Sunken Sanctuary instead heals up to 7 HP, adds no card, and starts the next fight with 2 mana. The HP event requires more than 4 HP; the exchange allows cancellation before a card is chosen, preserves deck size, and can be saved and resumed while choosing. Completed detours are recorded and excluded from later combat offers; older saves made after an already-completed detour have no such history. Routes rejoin before the next scheduled fight. Relics can alter these choices: Ashen Seal grants 2 Ward after a played card Banishes itself, and Hollow Chalice heals 3 HP, up to maximum, for skipping a nonempty card reward. Banish of another card does not trigger Ashen Seal, and its Ward comes after the card's own effects. See `tests/lib/relics.test.ts`, `tests/lib/expedition.test.ts` and `tests/lib/run.test.ts`.

Current HP is visible at reward, route, and midpoint-rest choices; healing previews show the amount available below maximum HP. The run deck can be inspected at reward and route choices, from the combat pile browser, and on the end-of-run screen. A qualifying expedition's end screen also shows the saved pool tier and Nocturne unlock; failed progression writes show a save error instead of reporting an unlock. The deck browser groups physical cards by pair and shows both faces and copy counts. It does not show the order or current facing of cards in the hidden library, and inspection does not change the run or consume randomness.

## Antiheroes

The three initial antiheroes and these revised starting kits are playtest designs. Existing saved decks are preserved. All use the same one-mana card and turn rules, and their selected class persists for the run. The normal light/dark starting orientation and expedition relic apply independently of class.

- **The Oathless Seraph:** before each light card without a direct attack resolves, gain 1 Ward; earlier Seraph saves retain their original light-card passive. New runs start with Angel & Vampire and Benediction & Curse once each, plus two each of Feather & Chain, Seraph & Fallen Seraph, Bloom & Wither, and Key & Lock.
- **The Thorn Witch:** before each dark attack card, apply 1 Curse. New runs start with Angel & Vampire and Censer & Plague Brazier once each, plus two each of Sun & Moon, Ivy & Thorns, Bloom & Wither, and Key & Lock. Earlier Witch saves retain their previous Curse or 2 Poison passive.
- **The Veiled Oracle:** Scry at the start of each player turn, after the normal draw. New runs start with Angel & Vampire and Candle & Extinguished Candle once each, plus two each of Sun & Moon, Bloom & Wither, Key & Lock, and Oracle & Deceiver.

Light/dark passives trigger on an accepted eligible play, after payment and before the card effect. A paid hidden-card inspection receives its passive when committed, never again when the choice resolves. Rejected plays do not trigger it. Scry follows its normal empty-library and end-turn rules. Original starter pairs absent from a hero's kit remain eligible for that hero's rewards and expedition events; existing runs without a class retain their original reward pools.

## Playtest card adjustments

Wax Seal gives 7 Ward and Banishes itself; Torn Letter draws two and Banishes itself. Wooden Spool Keeps the rest of the hand, while Loose Thread Flips it. These provisional runtime effects replace the historical catalogue wording. Existing saves remain readable and use the current effects when those cards are played.

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

Iron Needlecase and Empty Needlecase also use provisional playtest effects: the filled case deals 2 Binding damage twice and Keeps itself; the empty case refunds its mana and Banishes itself. Existing saved cards use these current effects.
