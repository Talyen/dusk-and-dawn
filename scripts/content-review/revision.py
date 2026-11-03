"""Generate the status revision audit and clearly separate unapproved proposals."""
from build import *
from rules_contract import STATUS_POLICY,RULES
from status_model import tick_sequence

PROPOSALS={
 'Freeze':{
  'status':'discussion-only; no card or enemy uses Freeze',
  'recommendation':'Keep Freeze out of the current contract until halving statuses and the new targets are tested. Frost already uses Weaken. If attack prevention still feels missing, test a breakable freeze as a small separate prototype.',
  'alternatives':[
   'Use Frost attacks plus Weaken: adds no status or lockout rule, but does not communicate a complete freeze.',
   'Reduce all hits of the next attack: distinguishes it from first-hit Weaken, but amounts, expiry and repeated zero-damage attacks need testing.',
   'Skip the next whole action: clearest immobility fantasy and strongest control, but can erase all pressure when chained and overlaps Hush.',
   'Breakable freeze: provisionally skip the next action, ending sooner on any damage. This creates a preparation window rather than free damage; Burn and Poison can thaw it before the action. It needs explicit answers for reactive traits, Hush, reflected damage and an expiring skipped action.'
  ],
  'trial_constraints':'Do not add a player effect, immunity, resistance or once-per-fight exception here. A future trial should show exactly when thaw occurs and initially Banish its source. Banish limits repeats but does not prove safety from lockouts.'
 },
 'Curse':{
  'status':'discussion-only',
  'recommendation':'Use Curse as an evocative card or action name with an explicit effect for now, rather than an unspecified debuff keyword. Existing Mark, Weaken and Poison already express clear harms.',
  'alternatives':[
   'Curse as another Weaken or Mark is easy to implement but duplicates an existing rule.',
   'Curse as reduced healing creates a distinct anti-recovery role, but is ineffective against most current enemies. A possible later trial is “Reduce the next HP heal by N, to a minimum of 0, then remove Curse”; keep only the higher pending value, do not add, and clear at fight end. It would affect Leech healing but never its damage, and would not reverse an earlier heal. Consume it on the next healing effect even at full HP; do not track HP actually restored.',
   'Curse as damage per card play punishes hand-play builds and is asymmetric because enemies have action pools rather than hands. Do not introduce it without a concrete encounter reason.'
  ],
  'classification_if_adopted':'Harmful combatant status; a candidate for Cleanse, not Purge. The exact effect, N and lifetime still need approval.'
 },
 'Bless':{
  'status':'discussion-only',
  'recommendation':'Keep blessing-themed cards explicit for now: healing, Ward or another printed benefit. “Bless” alone does not yet explain a specific rule.',
  'concrete_later_option':'Bless N could add N to the holder’s next direct attack, first hit only, then end. Use the higher pending value rather than adding; clear at fight end. Apply it with Mark and weakness before Weaken, reflection and Ward. It would also increase Leech’s final amount. This is a proposal, not current damage order.',
  'tradeoff':'This is an attacker-side buff versus Mark’s target-side debuff, giving Purge and Cleanse different answers. Against one enemy their damage math is otherwise very similar, so it may add vocabulary without a useful new decision.',
  'classification_if_adopted':'Beneficial combatant status; removable by Purge, not Cleanse. No light-side or moral restriction.'
 },
 'Purge':{
  'status':'recommended for a later approved migration; not used in current effects',
  'proposed_definition':'Remove all beneficial combat statuses from the enemy.',
  'scope':'Currently Ward and an active Reflect effect. No amount, duration, selection prompt or random status choice. This is an immediate removal procedure, not a status itself.',
  'edge_cases':'Do not remove printed traits, HP, action patterns or card-zone states. Consuming a one-use Reflect granted by the Swan’s current intent must leave that activation spent until a new intent grants one; it must not instantly reappear from the same trait. Hush instead suppresses the trait through its action. Purge does not undo damage or healing.'
 },
 'Cleanse':{
  'status':'recommended for a later approved migration; not used in current effects',
  'proposed_definition':'Remove all harmful combat statuses from yourself.',
  'scope':'Currently Burn, Poison, Mark and Weaken, plus visible next-draw and next-mana penalties. Include Hush if the owner can have it, but a Hushed ability cannot resolve a Cleanse to escape its own suppression. No amount, duration or selection prompt.',
  'edge_cases':'Do not heal HP, recover Banished cards, undo an already completed face change or remove Keep markers. A queued face change is neutral information/control, not automatically classified good or bad. If that scope feels unintuitive, name its removal explicitly rather than changing classification based on the current hand.'
 }
}
CLASSIFICATION={
 'beneficial_combat_statuses':['Ward','Reflect'],
 'harmful_combat_statuses':['Burn','Poison','Mark','Weaken','Hush','next-normal-draw penalty','next-mana-refill penalty'],
 'other_state':['Keep markers belong to individual cards','Scry is a player-turn information effect','face orientation and queued face changes are neutral','Leech modifies its printed attack; it is not a persistent removable status','HP, library/discard/Banish zones, printed traits and action patterns are not removable combat statuses'],
 'proposal_only':['If approved, Bless would be beneficial and Curse harmful. Their names do not establish their exact effects.'],
 'principle':'Classification follows the printed rule, not artwork morality or whether a particular board position happens to benefit. This table is proposed scope for the candidate removal keywords, not a new thematic tag system.'
}

def produce_revision(cs,es):
 from render import page,mark,p,ul,section
 before=readjson(HERE/'mechanics-baseline.json')
 cardaudit=[]
 for n,c in enumerate(cs,1):
  prior=before['cards'][c['face']];changed=prior!=c['effect'];relevant=changed or bool(set(c['keywords'])&{'Ward','Burn','Poison','Scry','Keep','Flip'})
  cardaudit.append({'number':n,'face':c['face'],'before':prior,'after':c['effect'],'changed':changed,'review':'updated thematic recipe' if changed else 'existing effect checked against revised timing' if relevant else 'checked; no affected mechanic','keywords':c['keywords']})
 enemyaudit=[]
 for e in es:
  prior=before['enemies'][str(e['number'])];actions=[a['preview'] for a in e['actions']]
  enemyaudit.append({'number':e['number'],'name':e['name'],'before_trait':prior['trait'],'after_trait':e['trait']['effect'],'changed':prior['trait']!=e['trait']['effect'] or prior['actions']!=actions or prior['weakness']!=e['weakness']['type'],'review':'all base effects, trait scope, weakness and Hush previews checked','actions':actions})
 counts={'card_faces_checked':496,'enemies_checked':110,'changed_card_descriptions_since_previous_commit':sum(x['changed'] for x in cardaudit),'enemy_entries_with_text_or_type_changes':sum(x['changed'] for x in enemyaudit),'self_Keep_faces':sum('Keep this card.' in c['effect'] for c in cs),'whole_hand_Keep_faces':sum('Keep your hand.' in c['effect'] for c in cs),'random_Keep_faces':sum(bool(re.search(r'Keep (?:a|\d+) random',c['effect'])) for c in cs),'self_Flip_faces':sum('Flip this card.' in c['effect'] for c in cs),'whole_hand_Flip_faces':sum('Flip your hand.' in c['effect'] for c in cs),'random_Flip_faces':sum(bool(re.search(r'Flip (?:a|\d+) random',c['effect'])) for c in cs),'top_discard_Flip_faces':sum('Flip the top card of your discard pile.' in c['effect'] for c in cs),'Poison_applying_faces':sum(bool(re.search(r'Apply \d+ Poison',c['effect'])) for c in cs),'Poison_applying_enemies':sum(any(a['op']=='poison' for atoms in e['trait']['by_action'].values() for a in atoms) for e in es),'selection_prompts_for_Keep_or_Flip':0}
 impact=[
 'Ward banking makes spare defense useful across turns and can make quiet enemy turns more defensive. Repeated gains may support stalls: 10 Ward every turn with no damage approaches 19 from zero after gain. Values remain unchanged pending playtests; test healing plus Ward and shield-stripping counters.',
 'Burn loses damage faster: Burn 3 changes from 3+2+1=6 to 3+1=4; Burn 4 becomes 4+2+1=7. Poison uses the same curve with Decay damage. Existing Burn amounts are preserved; the six new Poison faces use provisional values. Both counters coexist, can be absorbed by Ward, and use max application rather than additive stacking. They deliberately share their math; their current differences are their independent counters, damage labels and specific cures or feeding interactions.',
 'Damage-over-time instances are not direct attacks. Neither Burn nor Poison triggers weakness, Mark, Weaken, Reflect or Leech. Fire replaces the damage label only; the card named Flame and all artwork filenames retain their identities.',
 'Scry trades top-card filtering for turn-long information. Scry followed by Draw reveals the next top too, supporting informed draw, ordering and facing decisions without a prompt. A pure Scry face may be weak at 1 mana; test it before adding unrelated rider effects.',
 'Self-Keep preserves a particular known physical card, including its opposite face for later Flip. Whole-hand Keep can preserve too much and restrict fresh draws: seven kept cards allow only one new card under the cap. It never grants a free replay; every play still costs 1 mana.',
 'Self-Flip plus self-Keep gives Cocoon, Flower Bud and other transformation subjects a direct change of form. The original played description finishes even after its source flips. Random targets reduce prompts but reduce precision; sample only after payment, without replacement, and preview the pool rather than a secret result.',
 'Pottery Workshop, Glassblower and Tarnished Mirror now transform the visible top discarded card. End-turn discard order follows hand order rather than asking for an ordering choice; bespoke effects that explicitly say “in any order” retain that deliberate choice.',
 'The Mould Harpist spreads spores; Saffron Spider and Velvet Widow deliver venom. The Janitor removes both damaging residues. Poison 2 totals 3 before prevention; Poison 3 totals 4. These are thematic proposals with different pressure, not tested encounter balance. The Plague Doctor explicitly treats Poison; most other recovery remains unchanged.',
 'Freeze, Curse and Bless need a distinct approved function before becoming keywords. Purge and Cleanse can be clear procedures with fixed scope and no extra target menu, but broadening an existing narrow cure into either would be a separate balance change.'
 ]
 report={'source_commit':before['source_commit'],'status':'design-proposal; no human playtest or full combat simulation','timing_and_rounding':STATUS_POLICY,'counts':counts,'damage_over_time_examples':{str(n):tick_sequence(n) for n in [1,2,3,4,7,16]},'balance_and_gameplay':impact,'unapproved_keyword_proposals':PROPOSALS,'proposed_status_classification':CLASSIFICATION,'cards':cardaudit,'enemies':enemyaudit}
 writejson(DOCS/'Status and Targeting Revision v0.1.json',report)
 body='<header><p class="eyebrow">Dusk & Dawn · proposed status revision</p><h1>Halving statuses. Fewer target prompts.</h1><p>Current directions are applied across the rules, 496 card faces and 110 enemies. Timing, rounding and values are provisional. Freeze, Curse, Bless, Purge and Cleanse remain discussion proposals and are not used by any current effect.</p></header>'
 body+=section('current','Applied rule contract',ul([RULES[k]['definition'] for k in ['Ward','Burn','Poison','Scry','Keep','Flip']])+p('Provisional timing: player Ward halves before refill and draw. Clear Scry when End Turn begins; discard unkept cards; tick player Burn, player Poison, enemy Burn, then enemy Poison. Halve each damaging status immediately after its hit and remove 0. If the enemy survives, halve its remaining Ward before its action, even if Hushed. Stop immediately on defeat. Poison and Burn apply by maximum value, separately. Rounding down prevents immortal 1-point counters.'))
 body+=section('counts','Complete review coverage',ul([k.replace('_',' ')+': '+str(v) for k,v in counts.items()]))
 body+=section('impact','Balance and gameplay implications',ul(impact))
 for key,d in PROPOSALS.items():
  text=''.join('<h3>'+html.escape(k.replace('_',' ').capitalize())+'</h3>'+(ul(v) if isinstance(v,list) else p(v)) for k,v in d.items())
  body+=section(key.lower(),key+' · discussion only',text)
 body+=section('classification','Proposed removal scope',ul([k.replace('_',' ')+': '+(', '.join(v) if isinstance(v,list) else v) for k,v in CLASSIFICATION.items()]))
 body+=section('examples','Changed descriptions', '<div class="table-wrap"><table><thead><tr><th>Face</th><th>Before</th><th>Current proposal</th></tr></thead><tbody>'+''.join('<tr><th>'+html.escape(x['face'])+'</th><td>'+mark(x['before'])+'</td><td>'+mark(x['after'])+'</td></tr>' for x in cardaudit if x['changed'])+'</tbody></table></div>')
 body+='<footer>The companion JSON records all 606 checks and every current action preview. Read the <a href="'+__import__('urllib.parse',fromlist=['quote']).quote(GAME+'.html')+'">design</a> and the <a href="Full%20Content%20Review%20v0.1.html">individual artwork rationales</a>. Focused reference-model checks are not a running game or proof of balance.</footer>'
 (DOCS/'Status and Targeting Revision v0.1.html').write_text(page('Dusk & Dawn — Status and Targeting Revision',body))
 return report
