"""Approved directions with explicitly provisional scaling and undecided thaw."""
RULES={'Ward': {'definition': 'Absorb incoming damage before HP. At the start of its holder’s turn, halve remaining Ward, '
                        'rounding down. Remove it at 0.',
          'notes': ['Player Ward halves before mana refill and draw. Enemy Ward halves when its action begins, after '
                    'damage-over-time ticks, even if Hush or Freeze skips the action.',
                    'New Ward adds to remaining Ward. Ward absorbs direct damage, Burn and Poison, but does not stop '
                    'separate status or card-movement effects. No effect tests whether damage reached Ward or HP.']},
 'Burn': {'definition': 'At player turn end, deal Fire damage equal to Burn, then halve Burn, rounding down. Remove it at '
                        '0. Applying Burn keeps the higher value; it does not add.',
          'notes': ['Resolve player Burn, player Poison, enemy Burn, then enemy Poison. Stop if a combatant is defeated.',
                    'Ward absorbs the tick. Bless, Curse, weakness, Reflect and Leech do not modify it. An enemy applies '
                    'Burn after the tick step; it first ticks at the following player turn end.']},
 'Poison': {'definition': 'At player turn end, deal Decay damage equal to Poison, then halve Poison, rounding down. Remove '
                          'it at 0. Applying Poison keeps the higher value; it does not add.',
            'notes': ['Poison and Burn are separate counters and can coexist. Neither application replaces the other.',
                      'Use the same timing and damage rules as Burn, including Ward absorption. Poison represents venom, '
                      'toxic contamination or lingering sickness where the artwork supports it.']},
 'Scry': {'definition': 'Reveal the top card of your library for the rest of this player turn. If the top changes, reveal '
                        'the new top.',
          'notes': ['Scry has no choice, discard, movement or reshuffle. An empty library shows no card; reveal its top if '
                    'another effect refills it before the turn ends.',
                    'Repeated Scry does not stack. Clear it when End Turn begins, before discarding cards. The library is '
                    'the draw pile.']},
 'Hush': {'definition': 'Suppress the enemy’s labeled trait through its next action. Skip a non-attack ability; an attack '
                        'keeps its base hits. Advance the pattern normally.',
          'notes': ['Hush starts immediately and ends after the action’s aftereffects, including traits active while the '
                    'intent is shown.',
                    'Hush does not remove existing Ward, Bless or Curse, undo damage or revealed information, or undo an '
                    'already-applied next-turn effect. Ward still halves at the enemy action start.',
                    'Hush does not stack. A pure Hush card needs a suppressible ability or trait in the current intent. A '
                    'conditional trait counts even before its condition is met.',
                    'Every current Hush face Banishes its source.']},
 'Keep': {'definition': 'Give the stated cards a Keep marker. They survive this turn’s discard on their current faces. '
                        '“Keep this card” returns the resolving source to your hand, marked, when its effect finishes.',
          'notes': ['“Keep your hand” marks the cards currently in hand and excludes the resolving source. Random targets '
                    'are picked automatically without replacement; use all available cards if fewer exist.',
                    'Kept cards remain playable and count toward the 8-card cap. A self-Keep source returns only if space '
                    'remains; otherwise discard it. Water Clock draws before self-Keep, so a full hand can prevent that '
                    'return. Preview the failure.',
                    'A card leaving the hand loses its marker. Kept cards lose their markers after the end-turn discard. '
                    'Next turn draw up to 5 new cards within the 8-card cap.',
                    'Enemy held-card effects check the actual hand after discard. There is no retained-card snapshot or '
                    'prior identity tracking.']},
 'Flip': {'definition': 'Turn the stated cards to their other faces. Whole-hand, self, top-of-pile and random targets are '
                        'explicit and require no selection prompt.',
          'notes': ['“Flip your hand” changes only the current hand and excludes the resolving source. “Flip this card” '
                    'changes the resolving physical source; finish the effect printed on the face that was played.',
                    'Pick random cards after paying, uniformly without replacement. If fewer exist, use all available '
                    'cards. Show the eligible pool before play and the result afterward; do not reveal or reroll a hidden '
                    'outcome on hover or cancellation.',
                    'Cards keep their faces through movement and reshuffling. A flipped source normally enters the discard '
                    'pile on its new face; self-Keep instead returns it to hand on that face.']},
 'Banish': {'definition': 'Remove the physical card, including both faces, for this fight. Return it to the run deck '
                          'afterward. Banished cards cannot be recovered during a fight.',
            'notes': ['This spends the depicted opportunity for the encounter; it need not mean that a depicted creature '
                      'literally dies.',
                      'An enemy’s Banish can remove a player card; show its destination and that it returns after the '
                      'fight.']},
 'Reflect': {'definition': 'Redirect the next attack’s first hit to its attacker, keeping its final damage and type. Then '
                           'Reflect ends. Reflect does not stack.',
             'notes': ['Apply Bless, Curse and weakness before reflection; do not apply them again at the new target. The '
                       'attacker’s Ward can absorb the returned hit unless the hit ignores Ward.',
                       'A reflected hit cannot be reflected again. A 0-damage hit still spends Reflect. Burn, Poison and '
                       'separate trait damage are not attacks.',
                       'A trait may specify an earlier expiry, such as the end of its displayed intent. Hush suspends that '
                       'trait’s reflection immediately.']},
 'Leech': {'definition': 'Heal for the attack’s final damage after bonuses and Bless/Curse, before Ward. Count Ward '
                         'absorption and overkill. Healing stops at maximum HP.',
           'notes': ['For multiple hits with Leech, total their final damage values; do not track HP actually lost.',
                     'Leech is healing attached to that attack, not a damage type or a second hidden effect. It cannot '
                     'revive an attacker already defeated.',
                     'Food, medicine and other fixed heals remain fixed heals.']},
 'Bless': {'definition': 'Gain the stated number of Bless stacks. Your next direct attack gains damage on every hit, then '
                         'all Bless is spent.',
           'notes': ['Bless applications add. It persists through non-attack actions and clears at fight end. A 0-damage '
                     'attack still spends it.',
                     'Working flat proposal: +1 damage per hit per stack. Percentage scaling remains undecided; see the '
                     'comparison.',
                     'Add matching weakness to the first card hit, then resolve Bless and Curse together, then Reflect and '
                     'Ward. Added hits in that attack receive the modifier; Burn, Poison and separate reactions do not.']},
 'Curse': {'definition': 'Apply the stated number of Curse stacks to the enemy unless another target is named. Its next '
                         'direct attack loses damage on every hit, then all Curse is spent.',
           'notes': ['Curse applications add. It persists through non-attack actions and clears at fight end. Bless and '
                     'Curse can coexist; neither deletes the other.',
                     'Working flat proposal: subtract 1 damage per hit per stack, minimum 0. Percentage scaling remains '
                     'undecided.',
                     'Curse does not silence traits or cancel separate status and card-movement clauses, even when every '
                     'attack hit becomes 0.']},
 'Freeze': {'definition': 'Freeze the enemy. If still Frozen when its next action begins, skip that whole action, advance '
                          'the pattern and remove Freeze.',
            'notes': ['Thaw from attacks or Fire remains undecided. Current previews are conditional on Freeze still being '
                      'active; they do not establish a thaw rule.',
                      'Freeze does not stack or queue more skipped actions. A pure Freeze effect needs an enemy that is not '
                      'already Frozen. Current Freeze cards target only the enemy.',
                      'Ward still halves at action start. Skipping an action skips its riders; reactive traits active while '
                      'the intent is shown remain active until that intent ends unless Hushed.',
                      'If Hush and Freeze affect the same step, both end there; they do not buy two skipped actions.']},
 'Cleanse': {'definition': 'Remove one random harmful status or all harmful statuses from yourself, exactly as the card '
                           'specifies.',
             'notes': ['One means one named status and its entire counter, not one stack. Random selection is uniform '
                       'across eligible active status kinds, not weighted by stack amounts. There is no selection prompt.',
                       'Current harmful statuses are Burn, Poison, Curse, Hush and Freeze, plus displayed next-draw and '
                       'next-mana penalties. A prevented action cannot resolve its own Cleanse.',
                       'An empty eligible pool does nothing; other printed sentences still resolve. Cleanse does not heal '
                       'HP, recover cards or undo a completed face change. Named narrow cures remain explicit separate '
                       'effects.']},
 'Purge': {'definition': 'Remove one random beneficial status or all beneficial statuses from the enemy, exactly as the '
                         'card specifies.',
           'notes': ['Eligible current combat statuses are Ward, Reflect and Bless. Clear the entire selected status. '
                     'Random selection is uniform by active status kind; an empty pool does nothing.',
                     'Do not remove printed traits, action patterns or future grants. Purging a one-use Reflect spends that '
                     'activation, so it cannot instantly return from the same displayed intent. Hush instead suppresses the '
                     'trait.',
                     'Quantity and random selection are printed on each card. Existing partial Ward removal remains a '
                     'separate narrow effect; it is not silently upgraded to Purge.']}}

STATUS_POLICY={'status': 'provisional-timing-and-rounding; values-not-playtested',
 'rounding': 'floor',
 'minimum': 0,
 'remove_at_zero': True,
 'Ward': {'decay': 'floor(value/2)',
          'player_timing': 'before player mana refill and normal draw',
          'enemy_timing': 'enemy action start, after all damage-over-time ticks, including skipped actions',
          'gain': 'add'},
 'damage_over_time': {'order': ['player Burn', 'player Poison', 'enemy Burn', 'enemy Poison'],
                      'timing': 'player turn end, after unkept cards are discarded',
                      'damage_types': {'Burn': 'Fire', 'Poison': 'Decay'},
                      'tick': 'current amount, then floor(amount/2)',
                      'application': 'maximum of existing and incoming value, separately per status',
                      'blocked_damage_still_decays': True,
                      'modified_by_Bless_Curse_weakness_Reflect_Leech': False,
                      'defeat': 'stop immediately'},
 'Scry': {'scope': 'current top of library, follows changes',
          'duration': 'until End Turn begins',
          'choices': 0,
          'forces_reshuffle': False,
          'stacking': 'does not stack'},
 'Keep': {'source': 'return marked source after resolution, within hand cap',
          'whole_hand': 'current hand only, source excluded',
          'random': 'automatic, uniformly without replacement',
          'empty_random_pool': 'do nothing',
          'insufficient_random_pool': 'use all available',
          'marker_loss': 'leaving hand or after end-turn discard',
          'self_return_when_full': 'discard instead'},
 'Flip': {'self': 'resolving physical source; finish original played description',
          'whole_hand': 'current hand, source excluded',
          'top_of_pile': 'visible named top card, no choice',
          'random': 'automatic, uniformly without replacement after payment',
          'empty_random_pool': 'do nothing',
          'insufficient_random_pool': 'use all available'},
 'attack_modifiers': {'approved': 'Bless and Curse add stacks and affect every hit of the next direct attack; replace Mark '
                                  'and Weaken',
                      'final_scaling_decision': None,
                      'recommended_model': 'flat',
                      'working_preview_model': 'flat',
                      'flat_candidate': {'per_stack': 1,
                                         'formula': 'max(0, base hit + first-hit weakness + Bless - Curse)',
                                         'counter_cap': None,
                                         'damage_floor': 0,
                                         'upper_damage_cap': None},
                      'percentage_candidate': {'per_stack_percent': 25,
                                               'stacking': 'add percentage points; net Bless minus Curse before clamping',
                                               'multiplier_bounds': [0, 2],
                                               'rounding': 'nearest integer; half ties upward',
                                               'formula': 'round_half_up((base hit + first-hit weakness) * clamp(1 + '
                                                          '0.25*(Bless-Curse), 0, 2))',
                                               'status': 'comparison only, not approved'},
                      'duration': 'next direct attack, including its extra hits; non-attacks do not spend counters',
                      'stacking': 'add; consume all Bless and Curse on that attack, even at zero damage',
                      'damage_types': 'each hit keeps its printed type',
                      'damage_over_time_and_reactions': 'unmodified',
                      'end_of_fight': 'clear'},
 'Freeze': {'approved': 'enemy action control',
            'skip': 'whole next action if still active; advance pattern and clear',
            'stacking': 'does not stack or queue',
            'thaw_on_attack': None,
            'thaw_on_Fire': None,
            'preview': 'conditional on still Frozen at the scheduled action; no thaw rule assumed',
            'reactive_traits': 'remain active while displayed unless Hushed',
            'Ward_decay': 'still happens at action start',
            'target': 'enemy only'},
 'Cleanse': {'target': 'self',
             'quantity': 'one random eligible status or all, explicitly printed',
             'eligible': ['Burn',
                          'Poison',
                          'Curse',
                          'Hush',
                          'Freeze',
                          'next-normal-draw penalty',
                          'next-mana-refill penalty'],
             'one': 'whole named effect, all stacks',
             'random': 'uniform across active eligible kinds',
             'selection_prompts': 0,
             'empty_pool': 'do nothing; continue later sentences'},
 'Purge': {'target': 'enemy',
           'quantity': 'one random eligible status or all, explicitly printed',
           'eligible': ['Ward', 'Reflect', 'Bless'],
           'one': 'whole named effect, all stacks',
           'random': 'uniform across active eligible kinds',
           'selection_prompts': 0,
           'printed_traits': 'not eligible',
           'empty_pool': 'do nothing; continue later sentences'},
 'unresolved_decisions': ['Bless/Curse flat versus percentage scaling and final per-card stack counts',
                          'Freeze thaw from attacks and/or Fire']}
