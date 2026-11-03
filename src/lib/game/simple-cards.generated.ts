// Generated from the reviewed catalogue by scripts/generate-simple-cards.mjs.
export const simpleCards = {
  "Angel & Vampire": {
    light: {
      name: "Angel",
      effect: "Gain 5 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 5,
        },
      ],
    },
    dark: {
      name: "Vampire",
      effect: "Deal 4 Shadow damage. Leech.",
      keywords: ["Leech", "Shadow"],
      ops: [
        {
          op: "attack",
          amount: 4,
          type: "Shadow",
          hits: 1,
          leech: true,
        },
      ],
    },
  },
  "Seraph & Fallen Seraph": {
    light: {
      name: "Seraph",
      effect: "Deal 7 Radiance damage.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Fallen Seraph",
      effect: "Lose 2 HP. Deal 9 Shadow damage.",
      keywords: ["Shadow"],
      ops: [
        {
          op: "lose-hp",
          amount: 2,
        },
        {
          op: "attack",
          amount: 9,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Cherub & Imp": {
    light: {
      name: "Cherub",
      effect: "Heal 3 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Imp",
      effect: "Deal 4 Shadow damage. Flip a random card in your hand.",
      keywords: ["Flip", "Shadow"],
      ops: [
        {
          op: "attack",
          amount: 4,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
  },
  "Winged Guardian & Revenant": {
    light: {
      name: "Winged Guardian",
      effect: "Gain 7 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 7,
        },
      ],
    },
    dark: {
      name: "Revenant",
      effect: "Deal 3 Shadow damage. Keep this card.",
      keywords: ["Keep", "Shadow"],
      ops: [
        {
          op: "attack",
          amount: 3,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
        {
          op: "keep-self",
        },
      ],
    },
  },
  "Pilgrim & Exile": {
    light: {
      name: "Pilgrim",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Exile",
      effect: "Discard a random card. Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "discard-random",
        },
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
  },
  "Oracle & Deceiver": {
    light: {
      name: "Oracle",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Deceiver",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
  },
  "Abbess & Vampire Countess": {
    light: {
      name: "Abbess",
      effect: "Cleanse one random harmful status from yourself. Heal 3 HP. Banish this card.",
      keywords: ["Banish", "Cleanse"],
      ops: [
        {
          op: "cleanse-one",
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Vampire Countess",
      effect: "Deal 5 Shadow damage. Leech. Banish this card.",
      keywords: ["Banish", "Leech", "Shadow"],
      ops: [
        {
          op: "attack",
          amount: 5,
          type: "Shadow",
          hits: 1,
          leech: true,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Gardener & Gravedigger": {
    light: {
      name: "Gardener",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Gravedigger",
      effect: "Banish the top card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
  },
  "Confession & Secrecy": {
    light: {
      name: "Confession",
      effect: "Discard a random card. Heal 3 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "discard-random",
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Secrecy",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
  },
  "Absolution & Condemnation": {
    light: {
      name: "Absolution",
      effect: "Heal 5 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Condemnation",
      effect: "Curse 3. Banish this card.",
      keywords: ["Banish", "Curse"],
      ops: [
        {
          op: "curse",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Temptation & Resolve": {
    dark: {
      name: "Temptation",
      effect: "Lose 2 HP. Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "lose-hp",
          amount: 2,
        },
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    light: {
      name: "Resolve",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
  },
  "Dove & Raven": {
    light: {
      name: "Dove",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Raven",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
  },
  "White Stag & Black Stag": {
    light: {
      name: "White Stag",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Black Stag",
      effect: "Deal 6 Shadow damage.",
      keywords: ["Shadow"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "White Swan & Black Swan": {
    light: {
      name: "White Swan",
      effect: "Reflect the first hit of the enemy's next attack. Banish this card.",
      keywords: ["Banish", "Reflect"],
      ops: [
        {
          op: "reflect",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Black Swan",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
  },
  "Lamb & Wolf": {
    light: {
      name: "Lamb",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Wolf",
      effect: "Deal 6 Shadow damage.",
      keywords: ["Shadow"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Butterfly & Moth": {
    light: {
      name: "Butterfly",
      effect: "Flip 2 random cards in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 2,
        },
      ],
    },
    dark: {
      name: "Moth",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
  },
  "Lark & Owl": {
    light: {
      name: "Lark",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Owl",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
  },
  "Sun & Moon": {
    light: {
      name: "Sun",
      effect: "Deal 6 Radiance damage.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Moon",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
  },
  "Sunrise & Eclipse": {
    light: {
      name: "Sunrise",
      effect: "Turn your hand to its light faces.",
      keywords: [],
      ops: [
        {
          op: "turn-hand",
          face: "light",
        },
      ],
    },
    dark: {
      name: "Eclipse",
      effect: "Turn your hand to its dark faces.",
      keywords: [],
      ops: [
        {
          op: "turn-hand",
          face: "dark",
        },
      ],
    },
  },
  "Flame & Frost": {
    light: {
      name: "Flame",
      effect: "Apply 3 Burn.",
      keywords: ["Burn"],
      ops: [
        {
          op: "burn",
          amount: 3,
        },
      ],
    },
    dark: {
      name: "Frost",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Rain & Drought": {
    light: {
      name: "Rain",
      effect: "Remove all Burn from both combatants. Heal 3 HP. Banish this card.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "remove-burn-both",
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Drought",
      effect: "Deal 6 Decay damage.",
      keywords: ["Decay"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Decay",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Bell Ringer & Silenced Bell Ringer": {
    light: {
      name: "Bell Ringer",
      effect: "Bless 2.",
      keywords: ["Bless"],
      ops: [
        {
          op: "bless",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Silenced Bell Ringer",
      effect: "Hush. Banish this card.",
      keywords: ["Banish", "Hush"],
      ops: [
        {
          op: "hush",
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Sacred Chalice & Blood Goblet": {
    light: {
      name: "Sacred Chalice",
      effect: "Heal 5 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Blood Goblet",
      effect: "Lose 2 HP. Gain 1 mana. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "lose-hp",
          amount: 2,
        },
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Censer & Plague Brazier": {
    light: {
      name: "Censer",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Plague Brazier",
      effect: "Apply 3 Poison.",
      keywords: ["Poison"],
      ops: [
        {
          op: "poison",
          amount: 3,
        },
      ],
    },
  },
  "Reliquary & Empty Reliquary": {
    light: {
      name: "Reliquary",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Empty Reliquary",
      effect: "Banish the bottom card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Bloom & Wither": {
    light: {
      name: "Bloom",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Wither",
      effect: "Deal 7 Decay damage. Banish this card.",
      keywords: ["Banish", "Decay"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Decay",
          hits: 1,
          leech: false,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Ivy & Thorns": {
    light: {
      name: "Ivy",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Thorns",
      effect: "Deal 2 Decay damage twice.",
      keywords: ["Decay"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Decay",
          hits: 2,
          leech: false,
        },
      ],
    },
  },
  "Key & Lock": {
    light: {
      name: "Key",
      effect: "Draw 1 card. Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "flip-hand",
        },
      ],
    },
    dark: {
      name: "Lock",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
  },
  "Mirror & Shattered Mirror": {
    light: {
      name: "Mirror",
      effect: "Reflect the first hit of the enemy's next attack. Banish this card.",
      keywords: ["Banish", "Reflect"],
      ops: [
        {
          op: "reflect",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Shattered Mirror",
      effect: "Deal 2 Release damage twice.",
      keywords: ["Release"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Release",
          hits: 2,
          leech: false,
        },
      ],
    },
  },
  "Candle & Extinguished Candle": {
    light: {
      name: "Candle",
      effect: "Gain 1 mana. Apply 2 Burn. Banish this card.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "burn",
          amount: 2,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Extinguished Candle",
      effect: "Turn your hand to its dark faces. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "turn-hand",
          face: "dark",
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Open Book & Sealed Book": {
    light: {
      name: "Open Book",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
    dark: {
      name: "Sealed Book",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
  },
  "Feather & Chain": {
    light: {
      name: "Feather",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Chain",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Cathedral & Ruined Cathedral": {
    light: {
      name: "Cathedral",
      effect: "Gain 7 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 7,
        },
      ],
    },
    dark: {
      name: "Ruined Cathedral",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Sunlit Chapel & Moonlit Crypt": {
    light: {
      name: "Sunlit Chapel",
      effect: "Cleanse one random harmful status from yourself. Heal 3 HP. Banish this card.",
      keywords: ["Banish", "Cleanse"],
      ops: [
        {
          op: "cleanse-one",
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Moonlit Crypt",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Bell Tower & Fallen Bell": {
    light: {
      name: "Bell Tower",
      effect: "Bless 2.",
      keywords: ["Bless"],
      ops: [
        {
          op: "bless",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Fallen Bell",
      effect: "Deal 7 Binding damage.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Binding",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Open Gate & Sealed Gate": {
    light: {
      name: "Open Gate",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Sealed Gate",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Sanctuary & Prison": {
    light: {
      name: "Sanctuary",
      effect: "Cleanse all harmful statuses from yourself. Heal 3 HP. Banish this card.",
      keywords: ["Banish", "Cleanse"],
      ops: [
        {
          op: "cleanse-all",
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Prison",
      effect: "Curse 3. Banish this card.",
      keywords: ["Banish", "Curse"],
      ops: [
        {
          op: "curse",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Mountain Monastery & Sunken Shrine": {
    light: {
      name: "Mountain Monastery",
      effect: "Gain 7 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 7,
        },
      ],
    },
    dark: {
      name: "Sunken Shrine",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Benediction & Curse": {
    light: {
      name: "Benediction",
      effect: "Bless 3. Banish this card.",
      keywords: ["Banish", "Bless"],
      ops: [
        {
          op: "bless",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Curse",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Dream & Nightmare": {
    light: {
      name: "Dream",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Nightmare",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Bound Soul & Unbound Spirit": {
    dark: {
      name: "Bound Soul",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    light: {
      name: "Unbound Spirit",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
  },
  "Sovereign & Jester": {
    light: {
      name: "Sovereign",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Jester",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
  },
  "Midwife & Undertaker": {
    light: {
      name: "Midwife",
      effect: "Heal 5 HP. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Undertaker",
      effect: "Banish the top card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
  },
  "Executioner & Resurrector": {
    light: {
      name: "Executioner",
      effect: "Deal 7 Radiance damage.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Resurrector",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
  },
  "Peacock & Vulture": {
    light: {
      name: "Peacock",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Vulture",
      effect: "Banish the top card of your discard pile. Heal 3 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Goldfish & Anglerfish": {
    light: {
      name: "Goldfish",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Anglerfish",
      effect: "Deal 3 Shadow damage. Curse 1.",
      keywords: ["Curse", "Shadow"],
      ops: [
        {
          op: "attack",
          amount: 3,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
        {
          op: "curse",
          amount: 1,
        },
      ],
    },
  },
  "Caged Songbird & Wild Songbird": {
    light: {
      name: "Caged Songbird",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Wild Songbird",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
  },
  "Tortoise & Hare": {
    light: {
      name: "Tortoise",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
    dark: {
      name: "Hare",
      effect: "Gain 1 mana. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Lighthouse & Shipwreck": {
    light: {
      name: "Lighthouse",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Shipwreck",
      effect: "Deal 7 Decay damage. Banish this card.",
      keywords: ["Banish", "Decay"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Decay",
          hits: 1,
          leech: false,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Glasshouse & Root Cellar": {
    light: {
      name: "Glasshouse",
      effect: "Heal 5 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Root Cellar",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
  "Orchard & Bone Orchard": {
    light: {
      name: "Orchard",
      effect: "Heal 5 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Bone Orchard",
      effect: "Banish the bottom card of your discard pile. Heal 3 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "bottom",
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Banquet Hall & Empty Banquet Hall": {
    light: {
      name: "Banquet Hall",
      effect: "Heal 5 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Empty Banquet Hall",
      effect: "Banish the top card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
  },
  "Observatory & Underground Cavern": {
    light: {
      name: "Observatory",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Underground Cavern",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Salt Flat & Deep Marsh": {
    light: {
      name: "Salt Flat",
      effect: "Deal 6 Radiance damage.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Deep Marsh",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Frozen Lake & Boiling Lake": {
    light: {
      name: "Frozen Lake",
      effect: "Curse 1. Deal 2 Frost damage.",
      keywords: ["Curse", "Frost"],
      ops: [
        {
          op: "curse",
          amount: 1,
        },
        {
          op: "attack",
          amount: 2,
          type: "Frost",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Boiling Lake",
      effect: "Deal 5 Fire damage. Apply 2 Burn.",
      keywords: ["Burn", "Fire"],
      ops: [
        {
          op: "attack",
          amount: 5,
          type: "Fire",
          hits: 1,
          leech: false,
        },
        {
          op: "burn",
          amount: 2,
        },
      ],
    },
  },
  "Floating Library & Sunken Library": {
    light: {
      name: "Floating Library",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Sunken Library",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "White Desert & Black Forest": {
    light: {
      name: "White Desert",
      effect: "Curse 1. Deal 3 Radiance damage.",
      keywords: ["Curse", "Radiance"],
      ops: [
        {
          op: "curse",
          amount: 1,
        },
        {
          op: "attack",
          amount: 3,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Black Forest",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
  "Compass & Labyrinth": {
    light: {
      name: "Compass",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Labyrinth",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Lantern & Shroud": {
    light: {
      name: "Lantern",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Shroud",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
  "Prism & Black Glass": {
    light: {
      name: "Prism",
      effect: "Deal 2 Radiance damage three times.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Radiance",
          hits: 3,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Black Glass",
      effect: "Reflect the first hit of the enemy's next attack. Banish this card.",
      keywords: ["Banish", "Reflect"],
      ops: [
        {
          op: "reflect",
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Tuned Violin & Broken Violin": {
    light: {
      name: "Tuned Violin",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Broken Violin",
      effect: "Curse 3. Banish this card.",
      keywords: ["Banish", "Curse"],
      ops: [
        {
          op: "curse",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Wax Seal & Torn Letter": {
    light: {
      name: "Wax Seal",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Torn Letter",
      effect: "Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish",
        },
      ],
    },
  },
  "Anchor & Kite": {
    light: {
      name: "Anchor",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Kite",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
  },
  "Lens & Blindfold": {
    light: {
      name: "Lens",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Blindfold",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Comb & Tangled Hair": {
    light: {
      name: "Comb",
      effect: "Turn your hand to its light faces.",
      keywords: [],
      ops: [
        {
          op: "turn-hand",
          face: "light",
        },
      ],
    },
    dark: {
      name: "Tangled Hair",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Symmetry & Asymmetry": {
    light: {
      name: "Symmetry",
      effect: "Bless 1. Curse 1.",
      keywords: ["Bless", "Curse"],
      ops: [
        {
          op: "bless",
          amount: 1,
        },
        {
          op: "curse",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Asymmetry",
      effect: "Draw 2 cards. Discard a random card.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
        {
          op: "discard-random",
        },
      ],
    },
  },
  "Unity & Fragmentation": {
    light: {
      name: "Unity",
      effect: "Draw 1 card. Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "keep-hand",
        },
      ],
    },
    dark: {
      name: "Fragmentation",
      effect: "Deal 3 Decay damage twice. Banish this card.",
      keywords: ["Banish", "Decay"],
      ops: [
        {
          op: "attack",
          amount: 3,
          type: "Decay",
          hits: 2,
          leech: false,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Compression & Expansion": {
    light: {
      name: "Compression",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Expansion",
      effect: "Draw 3 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 3,
        },
      ],
    },
  },
  "Gravity & Levitation": {
    light: {
      name: "Gravity",
      effect: "Deal 7 Binding damage.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Binding",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Levitation",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
  },
  "Stillness & Frenzy": {
    light: {
      name: "Stillness",
      effect: "Curse 3. Banish this card.",
      keywords: ["Banish", "Curse"],
      ops: [
        {
          op: "curse",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Frenzy",
      effect: "Discard a random card. Deal 10 Release damage.",
      keywords: ["Release"],
      ops: [
        {
          op: "discard-random",
        },
        {
          op: "attack",
          amount: 10,
          type: "Release",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Silence & Clamor": {
    light: {
      name: "Silence",
      effect: "Hush. Banish this card.",
      keywords: ["Banish", "Hush"],
      ops: [
        {
          op: "hush",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Clamor",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Awakening & Slumber": {
    light: {
      name: "Awakening",
      effect: "Draw 1 card. Turn your hand to its light faces. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "turn-hand",
          face: "light",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Slumber",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Plenty & Famine": {
    light: {
      name: "Plenty",
      effect: "Heal 5 HP. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Famine",
      effect: "Lose 2 HP. Deal 8 Decay damage.",
      keywords: ["Decay"],
      ops: [
        {
          op: "lose-hp",
          amount: 2,
        },
        {
          op: "attack",
          amount: 8,
          type: "Decay",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Exposure & Concealment": {
    light: {
      name: "Exposure",
      effect: "Purge all beneficial statuses from the enemy. Banish this card.",
      keywords: ["Banish", "Purge"],
      ops: [
        {
          op: "purge-all",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Concealment",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
  "Standard Bearer & Flag Burner": {
    light: {
      name: "Standard Bearer",
      effect: "Gain 1 mana. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Flag Burner",
      effect: "Apply 3 Burn. Banish this card.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "burn",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Animal Tamer & Shapeshifter": {
    light: {
      name: "Animal Tamer",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Shapeshifter",
      effect: "Flip this card. Keep this card.",
      keywords: ["Flip", "Keep"],
      ops: [
        {
          op: "flip-self",
        },
        {
          op: "keep-self",
        },
      ],
    },
  },
  "Mask Maker & Face Thief": {
    light: {
      name: "Mask Maker",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
    dark: {
      name: "Face Thief",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
  },
  "Fencer & Brawler": {
    light: {
      name: "Fencer",
      effect: "Deal 2 Radiance damage twice.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Radiance",
          hits: 2,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Brawler",
      effect: "Lose 2 HP. Deal 11 Decay damage.",
      keywords: ["Decay"],
      ops: [
        {
          op: "lose-hp",
          amount: 2,
        },
        {
          op: "attack",
          amount: 11,
          type: "Decay",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Charioteer & Ferryman": {
    light: {
      name: "Charioteer",
      effect: "Deal 7 Radiance damage.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Ferryman",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Auctioneer & Scavenger": {
    light: {
      name: "Auctioneer",
      effect: "Discard a random card. Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "discard-random",
        },
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Scavenger",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
  },
  "Ballerina & Contortionist": {
    light: {
      name: "Ballerina",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
    dark: {
      name: "Contortionist",
      effect: "Flip this card. Keep this card.",
      keywords: ["Flip", "Keep"],
      ops: [
        {
          op: "flip-self",
        },
        {
          op: "keep-self",
        },
      ],
    },
  },
  "Royal Hound & Stray Hound": {
    light: {
      name: "Royal Hound",
      effect: "Deal 2 Binding damage twice.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Binding",
          hits: 2,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Stray Hound",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
  },
  "Surveyor & Trespasser": {
    light: {
      name: "Surveyor",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Trespasser",
      effect: "Purge one random beneficial status from the enemy.",
      keywords: ["Purge"],
      ops: [
        {
          op: "purge-one",
        },
      ],
    },
  },
  "Chimney Sweep & Smoke Spirit": {
    light: {
      name: "Chimney Sweep",
      effect: "Remove all your Burn. Banish the top card of your discard pile.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "remove-status",
          status: "burn",
        },
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
    dark: {
      name: "Smoke Spirit",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Coral Reef & Kelp Forest": {
    light: {
      name: "Coral Reef",
      effect: "Gain 9 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 9,
        },
      ],
    },
    dark: {
      name: "Kelp Forest",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Oyster & Cuttlefish": {
    light: {
      name: "Oyster",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Cuttlefish",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
  },
  "Firefly & Cave Cricket": {
    light: {
      name: "Firefly",
      effect: "Turn your hand to its light faces.",
      keywords: [],
      ops: [
        {
          op: "turn-hand",
          face: "light",
        },
      ],
    },
    dark: {
      name: "Cave Cricket",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
  },
  "Stalactite & Geyser": {
    light: {
      name: "Stalactite",
      effect: "Deal 6 Binding damage.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Binding",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Geyser",
      effect: "Deal 7 Release damage. Banish this card.",
      keywords: ["Banish", "Release"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Release",
          hits: 1,
          leech: false,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Cocoon & Shed Skin": {
    light: {
      name: "Cocoon",
      effect: "Flip this card. Keep this card.",
      keywords: ["Flip", "Keep"],
      ops: [
        {
          op: "flip-self",
        },
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Shed Skin",
      effect: "Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Lotus & Corpse Flower": {
    light: {
      name: "Lotus",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Corpse Flower",
      effect: "Banish the bottom card of your discard pile. Deal 6 Decay damage.",
      keywords: ["Banish", "Decay"],
      ops: [
        {
          op: "banish-discard",
          position: "bottom",
        },
        {
          op: "attack",
          amount: 6,
          type: "Decay",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Kingfisher & Bat": {
    light: {
      name: "Kingfisher",
      effect: "Deal 5 Radiance damage.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 5,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Bat",
      effect: "Deal 3 Shadow damage. Leech.",
      keywords: ["Leech", "Shadow"],
      ops: [
        {
          op: "attack",
          amount: 3,
          type: "Shadow",
          hits: 1,
          leech: true,
        },
      ],
    },
  },
  "Sunflower & Moonflower": {
    light: {
      name: "Sunflower",
      effect: "Gain 1 mana. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Moonflower",
      effect: "Turn your hand to its dark faces.",
      keywords: [],
      ops: [
        {
          op: "turn-hand",
          face: "dark",
        },
      ],
    },
  },
  "Starfish & Sea Urchin": {
    light: {
      name: "Starfish",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Sea Urchin",
      effect: "Deal 5 Binding damage.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 5,
          type: "Binding",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Silkworm & Silverfish": {
    light: {
      name: "Silkworm",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Silverfish",
      effect: "Banish the bottom card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Sceptre & Begging Bowl": {
    light: {
      name: "Sceptre",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Begging Bowl",
      effect: "Draw 2 cards. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Scabbard & Drawn Blade": {
    light: {
      name: "Scabbard",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Drawn Blade",
      effect: "Deal 6 Release damage.",
      keywords: ["Release"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Release",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Tuning Fork & Rattle": {
    light: {
      name: "Tuning Fork",
      effect: "Remove all your Curse.",
      keywords: ["Curse"],
      ops: [
        {
          op: "remove-status",
          status: "curse",
        },
      ],
    },
    dark: {
      name: "Rattle",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Sundial & Water Clock": {
    light: {
      name: "Sundial",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Water Clock",
      effect: "Draw 1 card. Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "keep-self",
        },
      ],
    },
  },
  "Floodgate & Broken Dam": {
    light: {
      name: "Floodgate",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Broken Dam",
      effect: "Deal 7 Release damage.",
      keywords: ["Release"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Release",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Wax Fruit & Rotting Fruit": {
    light: {
      name: "Wax Fruit",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Rotting Fruit",
      effect: "Apply 3 Poison.",
      keywords: ["Poison"],
      ops: [
        {
          op: "poison",
          amount: 3,
        },
      ],
    },
  },
  "Measuring Rod & Twisted Ribbon": {
    light: {
      name: "Measuring Rod",
      effect: "Scry.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
      ],
    },
    dark: {
      name: "Twisted Ribbon",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Glass Slipper & Iron Boot": {
    light: {
      name: "Glass Slipper",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
    dark: {
      name: "Iron Boot",
      effect: "Deal 7 Binding damage.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Binding",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Wedding Veil & Funeral Veil": {
    light: {
      name: "Wedding Veil",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
    dark: {
      name: "Funeral Veil",
      effect: "Banish the top card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
  },
  "Amphitheatre & Backstage": {
    light: {
      name: "Amphitheatre",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Backstage",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
  },
  "Aqueduct & Sewer": {
    light: {
      name: "Aqueduct",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Sewer",
      effect: "Banish the bottom card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Marble Quarry & Peat Bog": {
    light: {
      name: "Marble Quarry",
      effect: "Deal 7 Binding damage.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Binding",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Peat Bog",
      effect: "Curse 1. Deal 2 Decay damage.",
      keywords: ["Curse", "Decay"],
      ops: [
        {
          op: "curse",
          amount: 1,
        },
        {
          op: "attack",
          amount: 2,
          type: "Decay",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Bathhouse & Icehouse": {
    light: {
      name: "Bathhouse",
      effect: "Remove all your Burn. Heal 4 HP. Banish this card.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "remove-status",
          status: "burn",
        },
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Icehouse",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
  "Dovecote & Spider Nursery": {
    light: {
      name: "Dovecote",
      effect: "Keep 2 random cards in your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-random",
          count: 2,
        },
      ],
    },
    dark: {
      name: "Spider Nursery",
      effect: "Apply 2 Poison.",
      keywords: ["Poison"],
      ops: [
        {
          op: "poison",
          amount: 2,
        },
      ],
    },
  },
  "Crystal Ballroom & Cinder Ballroom": {
    light: {
      name: "Crystal Ballroom",
      effect: "Reflect the first hit of the enemy's next attack. Banish this card.",
      keywords: ["Banish", "Reflect"],
      ops: [
        {
          op: "reflect",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Cinder Ballroom",
      effect: "Apply 3 Burn. Banish this card.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "burn",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Circus Ring & Abandoned Fairground": {
    light: {
      name: "Circus Ring",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
    dark: {
      name: "Abandoned Fairground",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Beehive Palace & Termite Palace": {
    light: {
      name: "Beehive Palace",
      effect: "Heal 5 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Termite Palace",
      effect: "Remove 6 enemy Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "remove-ward",
          amount: 6,
        },
      ],
    },
  },
  "Paved Road & Deer Trail": {
    light: {
      name: "Paved Road",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Deer Trail",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
  },
  "Bell Founder & Bell Breaker": {
    light: {
      name: "Bell Founder",
      effect: "Bless 2.",
      keywords: ["Bless"],
      ops: [
        {
          op: "bless",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Bell Breaker",
      effect: "Hush. Banish this card.",
      keywords: ["Banish", "Hush"],
      ops: [
        {
          op: "hush",
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Prism Keeper & Shade Keeper": {
    light: {
      name: "Prism Keeper",
      effect: "Deal 2 Radiance damage three times.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Radiance",
          hits: 3,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Shade Keeper",
      effect: "Keep 2 random cards in your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-random",
          count: 2,
        },
      ],
    },
  },
  "Dream Binder & Dream Unbinder": {
    light: {
      name: "Dream Binder",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Dream Unbinder",
      effect: "Remove all your Curse.",
      keywords: ["Curse"],
      ops: [
        {
          op: "remove-status",
          status: "curse",
        },
      ],
    },
  },
  "Court Physician & Plague Doctor": {
    light: {
      name: "Court Physician",
      effect: "Heal 5 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Plague Doctor",
      effect: "Remove all your Poison. Heal 3 HP. Banish this card.",
      keywords: ["Poison", "Banish"],
      ops: [
        {
          op: "remove-status",
          status: "poison",
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Portrait Painter & Portrait Eraser": {
    light: {
      name: "Portrait Painter",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
    dark: {
      name: "Portrait Eraser",
      effect: "Banish the top card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
  },
  "Perfumer & Scent Thief": {
    light: {
      name: "Perfumer",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Scent Thief",
      effect: "Banish the top card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
  },
  "Stone Mason & Stone Eater": {
    light: {
      name: "Stone Mason",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
    dark: {
      name: "Stone Eater",
      effect: "Remove 4 enemy Ward. Heal 3 HP. Banish this card.",
      keywords: ["Ward", "Banish"],
      ops: [
        {
          op: "remove-ward",
          amount: 4,
        },
        {
          op: "heal",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Bird Keeper & Bird Liberator": {
    light: {
      name: "Bird Keeper",
      effect: "Keep a random card in your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-random",
          count: 1,
        },
      ],
    },
    dark: {
      name: "Bird Liberator",
      effect: "Draw 3 cards. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Cage Builder & Cage Breaker": {
    light: {
      name: "Cage Builder",
      effect: "Keep a random card in your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-random",
          count: 1,
        },
      ],
    },
    dark: {
      name: "Cage Breaker",
      effect: "Remove all your Curse. Draw 2 cards. Banish this card.",
      keywords: ["Banish", "Curse"],
      ops: [
        {
          op: "remove-status",
          status: "curse",
        },
        {
          op: "draw",
          amount: 2,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Fortune Teller & Fortune Gambler": {
    light: {
      name: "Fortune Teller",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Fortune Gambler",
      effect: "Draw 3 cards. Discard a random card.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 3,
        },
        {
          op: "discard-random",
        },
      ],
    },
  },
  "Lantern Lighter & Lantern Snuffer": {
    light: {
      name: "Lantern Lighter",
      effect: "Apply 3 Burn.",
      keywords: ["Burn"],
      ops: [
        {
          op: "burn",
          amount: 3,
        },
      ],
    },
    dark: {
      name: "Lantern Snuffer",
      effect: "Remove all Burn from both combatants. Turn your hand to its dark faces.",
      keywords: ["Burn"],
      ops: [
        {
          op: "remove-burn-both",
        },
        {
          op: "turn-hand",
          face: "dark",
        },
      ],
    },
  },
  "Storyteller & Story Swallower": {
    light: {
      name: "Storyteller",
      effect: "Draw 2 cards. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Story Swallower",
      effect: "Banish the top card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
  },
  "Coin Minter & Coin Melter": {
    light: {
      name: "Coin Minter",
      effect: "Gain 1 mana. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Coin Melter",
      effect: "Apply 1 Burn. Gain 1 mana. Banish this card.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "burn",
          amount: 1,
        },
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Weather Watcher & Storm Chaser": {
    light: {
      name: "Weather Watcher",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Storm Chaser",
      effect: "Gain 1 mana. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Oath Keeper & Oath Breaker": {
    light: {
      name: "Oath Keeper",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Oath Breaker",
      effect: "Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Door Warden & Door Wanderer": {
    light: {
      name: "Door Warden",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
    dark: {
      name: "Door Wanderer",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
  },
  "Flying Beetle & Burrowing Beetle": {
    light: {
      name: "Flying Beetle",
      effect: "Deal 5 Release damage.",
      keywords: ["Release"],
      ops: [
        {
          op: "attack",
          amount: 5,
          type: "Release",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Burrowing Beetle",
      effect: "Gain 5 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 5,
        },
      ],
    },
  },
  "White Fox & Black Fox": {
    light: {
      name: "White Fox",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Black Fox",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
  },
  "Glass Snail & Stone Slug": {
    light: {
      name: "Glass Snail",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Stone Slug",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
  },
  "Dawn Crane & Night Heron": {
    light: {
      name: "Dawn Crane",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Night Heron",
      effect: "Deal 5 Shadow damage.",
      keywords: ["Shadow"],
      ops: [
        {
          op: "attack",
          amount: 5,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Sunfish & Deep Sea Dragonfish": {
    light: {
      name: "Sunfish",
      effect: "Deal 6 Radiance damage.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Deep Sea Dragonfish",
      effect: "Deal 5 Decay damage. Leech. Banish this card.",
      keywords: ["Banish", "Leech", "Decay"],
      ops: [
        {
          op: "attack",
          amount: 5,
          type: "Decay",
          hits: 1,
          leech: true,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Alabaster Spider & Obsidian Spider": {
    light: {
      name: "Alabaster Spider",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Obsidian Spider",
      effect: "Deal 2 Decay damage. Apply 2 Poison.",
      keywords: ["Poison", "Decay"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Decay",
          hits: 1,
          leech: false,
        },
        {
          op: "poison",
          amount: 2,
        },
      ],
    },
  },
  "Pearl Crab & Hermit Crab": {
    light: {
      name: "Pearl Crab",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
    dark: {
      name: "Hermit Crab",
      effect: "Gain 5 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 5,
        },
      ],
    },
  },
  "Honey Ant & Army Ant": {
    light: {
      name: "Honey Ant",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Army Ant",
      effect: "Deal 2 Decay damage three times.",
      keywords: ["Decay"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Decay",
          hits: 3,
          leech: false,
        },
      ],
    },
  },
  "Albino Serpent & Black Adder": {
    light: {
      name: "Albino Serpent",
      effect: "Deal 6 Radiance damage.",
      keywords: ["Radiance"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Radiance",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Black Adder",
      effect: "Deal 3 Decay damage. Apply 2 Poison.",
      keywords: ["Poison", "Decay"],
      ops: [
        {
          op: "attack",
          amount: 3,
          type: "Decay",
          hits: 1,
          leech: false,
        },
        {
          op: "poison",
          amount: 2,
        },
      ],
    },
  },
  "Hard Coral & Soft Coral": {
    light: {
      name: "Hard Coral",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
    dark: {
      name: "Soft Coral",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
  },
  "Hummingbird & Hawk Moth": {
    light: {
      name: "Hummingbird",
      effect: "Gain 1 mana. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Hawk Moth",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Whole Egg & Cracked Egg": {
    light: {
      name: "Whole Egg",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Cracked Egg",
      effect: "Draw 2 cards. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Butterfly Wing & Beetle Shell": {
    light: {
      name: "Butterfly Wing",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
    dark: {
      name: "Beetle Shell",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
  },
  "Amber Frog & Indigo Toad": {
    light: {
      name: "Amber Frog",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Indigo Toad",
      effect: "Apply 3 Poison.",
      keywords: ["Poison"],
      ops: [
        {
          op: "poison",
          amount: 3,
        },
      ],
    },
  },
  "Red Panda & Clouded Leopard": {
    light: {
      name: "Red Panda",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Clouded Leopard",
      effect: "Deal 6 Shadow damage.",
      keywords: ["Shadow"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Living Jellyfish & Jellyfish Fossil": {
    light: {
      name: "Living Jellyfish",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Jellyfish Fossil",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
  },
  "White Poppy & Black Tulip": {
    light: {
      name: "White Poppy",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Black Tulip",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Fern Fiddlehead & Fallen Leaf": {
    light: {
      name: "Fern Fiddlehead",
      effect: "Flip this card. Keep this card.",
      keywords: ["Flip", "Keep"],
      ops: [
        {
          op: "flip-self",
        },
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Fallen Leaf",
      effect: "Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish",
        },
      ],
    },
  },
  "Flower Bud & Seed Pod": {
    light: {
      name: "Flower Bud",
      effect: "Flip this card. Keep this card.",
      keywords: ["Flip", "Keep"],
      ops: [
        {
          op: "flip-self",
        },
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Seed Pod",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
  },
  "Ice Crystal & Salt Crystal": {
    light: {
      name: "Ice Crystal",
      effect: "Freeze. Banish this card.",
      keywords: ["Banish", "Freeze"],
      ops: [
        {
          op: "freeze",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Salt Crystal",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
  },
  "River Pearl & Volcanic Obsidian": {
    light: {
      name: "River Pearl",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Volcanic Obsidian",
      effect: "Apply 3 Burn.",
      keywords: ["Burn"],
      ops: [
        {
          op: "burn",
          amount: 3,
        },
      ],
    },
  },
  "Golden Mask & Cracked Mask": {
    light: {
      name: "Golden Mask",
      effect: "Flip this card. Keep this card.",
      keywords: ["Flip", "Keep"],
      ops: [
        {
          op: "flip-self",
        },
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Cracked Mask",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
  },
  "Silver Crown & Rusty Crown": {
    light: {
      name: "Silver Crown",
      effect: "Bless 2.",
      keywords: ["Bless"],
      ops: [
        {
          op: "bless",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Rusty Crown",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Crystal Goblet & Clay Cup": {
    light: {
      name: "Crystal Goblet",
      effect: "Heal 5 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 5,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Clay Cup",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Silk Glove & Iron Gauntlet": {
    light: {
      name: "Silk Glove",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
    dark: {
      name: "Iron Gauntlet",
      effect: "Deal 6 Binding damage.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Binding",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Woven Basket & Unwoven Reeds": {
    light: {
      name: "Woven Basket",
      effect: "Keep 2 random cards in your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-random",
          count: 2,
        },
      ],
    },
    dark: {
      name: "Unwoven Reeds",
      effect: "Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish",
        },
      ],
    },
  },
  "Music Box & Silent Music Box": {
    light: {
      name: "Music Box",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Silent Music Box",
      effect: "Hush. Banish this card.",
      keywords: ["Banish", "Hush"],
      ops: [
        {
          op: "hush",
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Closed Parasol & Open Parasol": {
    light: {
      name: "Closed Parasol",
      effect: "Flip this card. Keep this card.",
      keywords: ["Flip", "Keep"],
      ops: [
        {
          op: "flip-self",
        },
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Open Parasol",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
  },
  "White Fan & Black Fan": {
    light: {
      name: "White Fan",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
    dark: {
      name: "Black Fan",
      effect: "Flip your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-hand",
        },
      ],
    },
  },
  "Wooden Spool & Loose Thread": {
    light: {
      name: "Wooden Spool",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Loose Thread",
      effect: "Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish",
        },
      ],
    },
  },
  "Gilded Cage & Broken Cage": {
    light: {
      name: "Gilded Cage",
      effect: "Keep a random card in your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-random",
          count: 1,
        },
      ],
    },
    dark: {
      name: "Broken Cage",
      effect: "Remove all your Curse. Draw 1 card.",
      keywords: ["Curse"],
      ops: [
        {
          op: "remove-status",
          status: "curse",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
  },
  "Glass Marble & Clay Marble": {
    light: {
      name: "Glass Marble",
      effect: "Reflect the first hit of the enemy's next attack. Banish this card.",
      keywords: ["Banish", "Reflect"],
      ops: [
        {
          op: "reflect",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Clay Marble",
      effect: "Deal 6 Binding damage.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 6,
          type: "Binding",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Silver Locket & Empty Locket": {
    light: {
      name: "Silver Locket",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Empty Locket",
      effect: "Banish the bottom card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Wax Key & Melted Key": {
    light: {
      name: "Wax Key",
      effect: "Draw 1 card. Flip your hand. Banish this card.",
      keywords: ["Flip", "Banish"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "flip-hand",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Melted Key",
      effect: "Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish",
        },
      ],
    },
  },
  "Copper Coin & Hollow Coin": {
    light: {
      name: "Copper Coin",
      effect: "Gain 1 mana. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Hollow Coin",
      effect: "Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Paintbrush & Paint Scraper": {
    light: {
      name: "Paintbrush",
      effect: "Flip a random card in your hand.",
      keywords: ["Flip"],
      ops: [
        {
          op: "flip-random",
          count: 1,
        },
      ],
    },
    dark: {
      name: "Paint Scraper",
      effect: "Banish the top card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "top",
        },
      ],
    },
  },
  "Lit Match & Spent Match": {
    light: {
      name: "Lit Match",
      effect: "Apply 3 Burn. Banish this card.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "burn",
          amount: 3,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Spent Match",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Paper Boat & Stone Boat": {
    light: {
      name: "Paper Boat",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Stone Boat",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
  },
  "Iron Needlecase & Empty Needlecase": {
    light: {
      name: "Iron Needlecase",
      effect: "Keep this card.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-self",
        },
      ],
    },
    dark: {
      name: "Empty Needlecase",
      effect: "Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish",
        },
      ],
    },
  },
  "White Ribbon & Black Ribbon": {
    light: {
      name: "White Ribbon",
      effect: "Keep 2 random cards in your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-random",
          count: 2,
        },
      ],
    },
    dark: {
      name: "Black Ribbon",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Hour Bell & Silent Bell": {
    light: {
      name: "Hour Bell",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Silent Bell",
      effect: "Hush. Banish this card.",
      keywords: ["Banish", "Hush"],
      ops: [
        {
          op: "hush",
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "Ivory Chess King & Obsidian Chess Queen": {
    light: {
      name: "Ivory Chess King",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Obsidian Chess Queen",
      effect: "Deal 7 Shadow damage.",
      keywords: ["Shadow"],
      ops: [
        {
          op: "attack",
          amount: 7,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Sunlit Gallery & Shadow Gallery": {
    light: {
      name: "Sunlit Gallery",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Shadow Gallery",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
  "Winter Conservatory & Summer Conservatory": {
    light: {
      name: "Winter Conservatory",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
    dark: {
      name: "Summer Conservatory",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
  },
  "High Balcony & Hidden Basement": {
    light: {
      name: "High Balcony",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Hidden Basement",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
  "Open Pavilion & Walled Pavilion": {
    light: {
      name: "Open Pavilion",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Walled Pavilion",
      effect: "Gain 8 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 8,
        },
      ],
    },
  },
  "Crystal Grotto & Basalt Cave": {
    light: {
      name: "Crystal Grotto",
      effect: "Reflect the first hit of the enemy's next attack. Banish this card.",
      keywords: ["Banish", "Reflect"],
      ops: [
        {
          op: "reflect",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Basalt Cave",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
  },
  "Marble Fountain & Dry Fountain": {
    light: {
      name: "Marble Fountain",
      effect: "Heal 6 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 6,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Dry Fountain",
      effect: "Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish",
        },
      ],
    },
  },
  "Golden Atrium & Black Atrium": {
    light: {
      name: "Golden Atrium",
      effect: "Draw 1 card. Turn your hand to its light faces. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "turn-hand",
          face: "light",
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Black Atrium",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
  "Moonlit Pier & Sunlit Pier": {
    dark: {
      name: "Moonlit Pier",
      effect: "Scry.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
      ],
    },
    light: {
      name: "Sunlit Pier",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
  },
  "Hilltop Windmill & Underground Mill": {
    light: {
      name: "Hilltop Windmill",
      effect: "Gain 1 mana. Draw 1 card. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "mana",
          amount: 1,
        },
        {
          op: "draw",
          amount: 1,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Underground Mill",
      effect: "Discard a random card. Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "discard-random",
        },
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
  },
  "Watchtower & Collapsed Watchtower": {
    light: {
      name: "Watchtower",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Collapsed Watchtower",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Open Courtyard & Roofed Courtyard": {
    light: {
      name: "Open Courtyard",
      effect: "Draw 2 cards.",
      keywords: [],
      ops: [
        {
          op: "draw",
          amount: 2,
        },
      ],
    },
    dark: {
      name: "Roofed Courtyard",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
  },
  "Grand Library & Forgotten Archive": {
    light: {
      name: "Grand Library",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
    dark: {
      name: "Forgotten Archive",
      effect: "Banish the bottom card of your discard pile.",
      keywords: ["Banish"],
      ops: [
        {
          op: "banish-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Frozen Waterfall & Flowing Waterfall": {
    light: {
      name: "Frozen Waterfall",
      effect: "Curse 1. Deal 3 Frost damage.",
      keywords: ["Curse", "Frost"],
      ops: [
        {
          op: "curse",
          amount: 1,
        },
        {
          op: "attack",
          amount: 3,
          type: "Frost",
          hits: 1,
          leech: false,
        },
      ],
    },
    dark: {
      name: "Flowing Waterfall",
      effect: "Remove all your Burn. Draw 1 card.",
      keywords: ["Burn"],
      ops: [
        {
          op: "remove-status",
          status: "burn",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
  },
  "Coral Palace & Ship Graveyard": {
    light: {
      name: "Coral Palace",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
    dark: {
      name: "Ship Graveyard",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Ivory Bridge & Obsidian Bridge": {
    light: {
      name: "Ivory Bridge",
      effect: "Return the top card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "top",
        },
      ],
    },
    dark: {
      name: "Obsidian Bridge",
      effect: "Curse 2.",
      keywords: ["Curse"],
      ops: [
        {
          op: "curse",
          amount: 2,
        },
      ],
    },
  },
  "Glass Stairway & Stone Stairway": {
    light: {
      name: "Glass Stairway",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Stone Stairway",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Candlelit Theatre & Darkened Theatre": {
    light: {
      name: "Candlelit Theatre",
      effect: "Turn your hand to its light faces.",
      keywords: [],
      ops: [
        {
          op: "turn-hand",
          face: "light",
        },
      ],
    },
    dark: {
      name: "Darkened Theatre",
      effect: "Turn your hand to its dark faces.",
      keywords: [],
      ops: [
        {
          op: "turn-hand",
          face: "dark",
        },
      ],
    },
  },
  "Tiled Bath & Broken Bath": {
    light: {
      name: "Tiled Bath",
      effect: "Remove all your Burn. Heal 4 HP. Banish this card.",
      keywords: ["Burn", "Banish"],
      ops: [
        {
          op: "remove-status",
          status: "burn",
        },
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Broken Bath",
      effect: "Deal 2 Decay damage twice.",
      keywords: ["Decay"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Decay",
          hits: 2,
          leech: false,
        },
      ],
    },
  },
  "Clock Tower & Timeless Tower": {
    light: {
      name: "Clock Tower",
      effect: "Scry. Draw 1 card.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
        {
          op: "draw",
          amount: 1,
        },
      ],
    },
    dark: {
      name: "Timeless Tower",
      effect: "Return the bottom card of your discard pile to your hand.",
      keywords: [],
      ops: [
        {
          op: "return-discard",
          position: "bottom",
        },
      ],
    },
  },
  "Silk Tent & Wicker Shelter": {
    light: {
      name: "Silk Tent",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
    dark: {
      name: "Wicker Shelter",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
  },
  "Stone Circle & Scattered Stones": {
    light: {
      name: "Stone Circle",
      effect: "Gain 6 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 6,
        },
      ],
    },
    dark: {
      name: "Scattered Stones",
      effect: "Deal 2 Binding damage three times.",
      keywords: ["Binding"],
      ops: [
        {
          op: "attack",
          amount: 2,
          type: "Binding",
          hits: 3,
          leech: false,
        },
      ],
    },
  },
  "Shallow Shore & Abyssal Trench": {
    light: {
      name: "Shallow Shore",
      effect: "Scry.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
      ],
    },
    dark: {
      name: "Abyssal Trench",
      effect: "Deal 5 Shadow damage.",
      keywords: ["Shadow"],
      ops: [
        {
          op: "attack",
          amount: 5,
          type: "Shadow",
          hits: 1,
          leech: false,
        },
      ],
    },
  },
  "Bright Clearing & Dense Canopy": {
    light: {
      name: "Bright Clearing",
      effect: "Heal 4 HP. Banish this card.",
      keywords: ["Banish"],
      ops: [
        {
          op: "heal",
          amount: 4,
        },
        {
          op: "banish",
        },
      ],
    },
    dark: {
      name: "Dense Canopy",
      effect: "Gain 7 Ward.",
      keywords: ["Ward"],
      ops: [
        {
          op: "ward",
          amount: 7,
        },
      ],
    },
  },
  "Open Window & Shuttered Window": {
    light: {
      name: "Open Window",
      effect: "Scry.",
      keywords: ["Scry"],
      ops: [
        {
          op: "scry",
        },
      ],
    },
    dark: {
      name: "Shuttered Window",
      effect: "Keep your hand.",
      keywords: ["Keep"],
      ops: [
        {
          op: "keep-hand",
        },
      ],
    },
  },
} as const;
