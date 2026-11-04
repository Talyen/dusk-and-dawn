# Bless and Curse: comparison playtest

This is a comparison, not a rules decision. The game still uses the provisional flat preview. The percentage model is the existing comparison candidate in the control review; no rate, rounding method, or cap has been approved.

## Candidates

- **Flat:** each net Bless adds 1 to every hit; each net Curse subtracts 1, to a minimum of 0. Bless and Curse cancel before damage is calculated.
- **Percentage candidate:** each net stack changes damage by 25 percentage points; combine stacks linearly, clamp the multiplier to 0×–2×, and round each hit to the nearest integer with half ties upward. Bless and Curse cancel. This is additive, not compounded: Bless 3 means 175%, not 1.25³.

In both models, weakness is added to the first hit before scaling; one attack spends all Bless and Curse. Damage is calculated per hit before Ward and Reflect. Leech follows the existing rules and can therefore magnify the effect of a stronger attack, including blocked damage or overkill.

## Controlled browser play

In identical isolated copies of the game, the Witch faced the Golden Menagerie's **3 + 2 + 2 + 2** attack. Censer followed by Thorns applied Curse 3, leaving one mana. Flat preview showed **0 + 0 + 0 + 0**; percentage showed **1 + 1 + 1 + 1**. Playing Sun and ending the turn left the Witch at 30/30 in the flat game and 26/30 in the percentage game. In the latter, Angel would instead have used the last mana to cover the four damage: an actual offense-versus-defense choice that the flat result removed. These were controlled positions, not independently completed human expeditions.

In another controlled browser position, the Seraph played Benediction (Bless 3), then Brawler (11 base damage, lose 2 HP). Flat dealt **14** and left the 48-HP enemy at 34; percentage dealt **19** and left it at 29. Both left the Seraph at 28 HP. The larger payoff gives the player a reason to save Bless for a large single hit, but may make burst and Leech too strong with current card values.

| Attack and stacks      |              Flat |        Percentage |
| ---------------------- | ----------------: | ----------------: |
| 3 + 2 + 2 + 2, Curse 1 | 2 + 1 + 1 + 1 = 5 | 2 + 2 + 2 + 2 = 8 |
| 3 + 2 + 2 + 2, Curse 2 | 1 + 0 + 0 + 0 = 1 | 2 + 1 + 1 + 1 = 5 |
| 3 + 2 + 2 + 2, Curse 3 |                 0 | 1 + 1 + 1 + 1 = 4 |
| Single 6, Bless 1      |                 7 |                 8 |
| Single 11, Bless 3     |                14 |                19 |

Rounding has a real cost in clarity: a 2-damage hit under Curse 1 remains 2 at 75%, so that stack does nothing to it. Rounding down would instead favor Curse and make some small Bless bonuses disappear; rounding up would favor Bless. Per-hit rounding also creates thresholds that are difficult to infer from the card art alone. The resolved enemy-intent numbers and concise status tooltips would need to make the actual outcome legible. Four net stacks reach the candidate's 0× or 2× cap; extra net stacks beyond that do not change the attack, though opposing stacks still cancel them.

## Paired expeditions

Six complete seeded expeditions were run through the real game engine for each candidate using the same simple card-ranking policy and route preference. These are automated comparative probes, not human playtests or a balance estimate. Different outcomes can change future choices and consume randomness differently, so matching seeds do not guarantee the same later rewards or encounters.

| Class, start, preferred route, seed | Flat: final HP / turns | Percentage: final HP / turns |
| ----------------------------------- | ---------------------: | ---------------------------: |
| Seraph, light, rest, 3              |                29 / 11 |                      29 / 11 |
| Seraph, light, combat, 8            |                23 / 21 |                      23 / 21 |
| Witch, dark, combat, 6              |                20 / 14 |                      29 / 17 |
| Witch, light, event, 11             |                22 / 16 |                      15 / 16 |
| Oracle, light, event, 9             |                14 / 14 |                      14 / 14 |
| Oracle, dark, rest, 4               |                 11 / 9 |                       11 / 9 |

All twelve runs won under this policy. Four pairs had the same recorded result; that reflects which cards and situations the policy encountered, not proof that the candidates are equivalent. The Witch seed 11 followed matching boss card sequences against the Menagerie: the percentage game entered that fight at 27 HP versus 28 and finished at 15 versus 22, consistent with its multi-hit attack retaining damage under Curse. The other Witch pair diverged in later rewards and encounters, including access to additional Leech, so its final-HP difference cannot be credited to scaling alone.

## Recommendation

Provisionally favor the percentage candidate for the next focused playtest because it preserves danger from small multi-hit attacks when a few Curse stacks would otherwise erase them. Keep the live flat preview unchanged for now. Before selecting a final rule, test the rounded-away first stack, Bless burst on large hits and Leech, and encounters or kits that can stack Curse repeatedly. Compare real player decisions across several natural expeditions; the small scripted sample here cannot establish balance. If percentage is selected, make the resolved numbers visible in existing contextual inspection rather than adding instructions to the board, and revisit the 25% step and 2× cap as explicit design choices.
