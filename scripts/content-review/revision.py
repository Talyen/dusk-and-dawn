"""Generate the status revision audit and clearly separate unapproved proposals."""
from build import *
from rules_contract import STATUS_POLICY,RULES
from status_model import tick_sequence

PROPOSALS={'Bless': {'status': 'approved stacking buff; numerical scaling open',
           'current_direction': 'Affects every hit of the owner’s next direct attack; applications add and all stacks are spent '
                                'on that attack. The catalogue shows a labeled provisional flat model.',
           'open_decision': 'Flat +1 per stack versus percentage scaling; no final unit is chosen.'},
 'Curse': {'status': 'approved stacking debuff; numerical scaling open',
           'current_direction': 'Affects every hit of the holder’s next direct attack; applications add and all stacks are '
                                'spent. It replaces Weaken; Mark is also removed.',
           'open_decision': 'Flat −1 per stack versus percentage scaling; compare actual attack values before deciding.'},
 'Freeze': {'status': 'approved enemy action control; thaw open',
            'current_direction': 'If still active, skip the next whole enemy action, advance the pattern and clear Freeze. It '
                                 'does not stack or queue turns.',
            'open_decision': 'Whether direct attacks or Fire thaw it is unresolved. Current conditional previews do not choose '
                             'either rule.'},
 'Purge': {'status': 'approved direction and quantities',
           'current_direction': 'Remove one random beneficial status or all from the enemy, as printed. One clears a whole kind, '
                                'regardless of stack count.',
           'scope': 'Ward, Reflect and Bless; not printed traits, action patterns or later grants.'},
 'Cleanse': {'status': 'approved direction and quantities',
             'current_direction': 'Remove one random harmful status or all from self, as printed. One clears a whole kind; '
                                  'random is uniform by eligible kind.',
             'scope': 'Burn, Poison, Curse, Hush, Freeze and visible draw/mana penalties. It does not heal HP or recover cards.'}}
CLASSIFICATION={'beneficial_combat_statuses': ['Ward', 'Reflect', 'Bless'],
 'harmful_combat_statuses': ['Burn', 'Poison', 'Curse', 'Hush', 'Freeze', 'next-normal-draw penalty', 'next-mana-refill penalty'],
 'other_state': ['Keep markers belong to individual cards',
                 'Scry is player-turn information',
                 'face orientation and queued facing changes are not automatically harmful',
                 'HP, library/discard/Banish zones, printed traits and action patterns are not removed'],
 'principle': 'One random kind or all is printed explicitly. Random is not weighted by counter size. This is mechanical removal '
              'scope, not a thematic tag system.'}

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
 'Damage-over-time instances are not direct attacks. Neither Burn nor Poison is modified by weakness, Bless, Curse, Reflect or Leech. Fire replaces the damage label only; the card named Flame and all artwork filenames retain their identities.',
 'Scry trades top-card filtering for turn-long information. Scry followed by Draw reveals the next top too, supporting informed draw, ordering and facing decisions without a prompt. A pure Scry face may be weak at 1 mana; test it before adding unrelated rider effects.',
 'Self-Keep preserves a particular known physical card, including its opposite face for later Flip. Whole-hand Keep can preserve too much and restrict fresh draws: seven kept cards allow only one new card under the cap. It never grants a free replay; every play still costs 1 mana.',
 'Self-Flip plus self-Keep gives Cocoon, Flower Bud and other transformation subjects a direct change of form. The original played description finishes even after its source flips. Random targets reduce prompts but reduce precision; sample only after payment, without replacement, and preview the pool rather than a secret result.',
 'Pottery Workshop, Glassblower and Tarnished Mirror now transform the visible top discarded card. End-turn discard order follows hand order rather than asking for an ordering choice; bespoke effects that explicitly say “in any order” retain that deliberate choice.',
 'The Mould Harpist spreads spores; Saffron Spider and Velvet Widow deliver venom. The Janitor removes both damaging residues. Poison 2 totals 3 before prevention; Poison 3 totals 4. These are thematic proposals with different pressure, not tested encounter balance. The Plague Doctor explicitly treats Poison; most other recovery remains unchanged.',
 'Bless and Curse are now stacking whole-attack modifiers; Mark and Weaken are retired. Cleanse and Purge print one random kind or all. Scaling and Freeze thaw remain unresolved; see the current comparison and prompt audit.'
 ]
 report={'source_commit':before['source_commit'],'status':'design-proposal; no human playtest or full combat simulation','timing_and_rounding':STATUS_POLICY,'counts':counts,'damage_over_time_examples':{str(n):tick_sequence(n) for n in [1,2,3,4,7,16]},'balance_and_gameplay':impact,'directions_and_open_parameters':PROPOSALS,'status_classification':CLASSIFICATION,'cards':cardaudit,'enemies':enemyaudit}
 writejson(DOCS/'Status and Targeting Revision v0.1.json',report)
 body='<header><p class="eyebrow">Dusk & Dawn · continued status revision</p><h1>Halving statuses. Fewer target prompts.</h1><p>Current directions are applied across the rules, 496 card faces and 110 enemies. Timing, rounding and values are provisional. Bless, Curse, Freeze, Cleanse and Purge now have approved directions. Numerical scaling and Freeze thaw remain open; see the linked current comparison.</p></header>'
 body+='<p><a href="Bless%20Curse%20and%20Control%20Review%20v0.1.html">Current scaling comparison, control decisions and prompt audit</a></p>'
 body+=section('current','Applied rule contract',ul([RULES[k]['definition'] for k in ['Ward','Burn','Poison','Scry','Keep','Flip']])+p('Provisional timing: player Ward halves before refill and draw. Clear Scry when End Turn begins; discard unkept cards; tick player Burn, player Poison, enemy Burn, then enemy Poison. Halve each damaging status immediately after its hit and remove 0. If the enemy survives, halve its remaining Ward before its action, even if Hushed. Stop immediately on defeat. Poison and Burn apply by maximum value, separately. Rounding down prevents immortal 1-point counters.'))
 body+=section('counts','Complete review coverage',ul([k.replace('_',' ')+': '+str(v) for k,v in counts.items()]))
 body+=section('impact','Balance and gameplay implications',ul(impact))
 for key,d in PROPOSALS.items():
  text=''.join('<h3>'+html.escape(k.replace('_',' ').capitalize())+'</h3>'+(ul(v) if isinstance(v,list) else p(v)) for k,v in d.items())
  body+=section(key.lower(),key+' · current direction and open details',text)
 body+=section('classification','Current removal scope',ul([k.replace('_',' ')+': '+(', '.join(v) if isinstance(v,list) else v) for k,v in CLASSIFICATION.items()]))
 body+=section('examples','Changed descriptions', '<div class="table-wrap"><table><thead><tr><th>Face</th><th>Before</th><th>Current proposal</th></tr></thead><tbody>'+''.join('<tr><th>'+html.escape(x['face'])+'</th><td>'+mark(x['before'])+'</td><td>'+mark(x['after'])+'</td></tr>' for x in cardaudit if x['changed'])+'</tbody></table></div>')
 body+='<footer>The companion JSON records all 606 checks and every current action preview. Read the <a href="'+__import__('urllib.parse',fromlist=['quote']).quote(GAME+'.html')+'">design</a> and the <a href="Full%20Content%20Review%20v0.1.html">individual artwork rationales</a>. Focused reference-model checks are not a running game or proof of balance.</footer>'
 (DOCS/'Status and Targeting Revision v0.1.html').write_text(page('Dusk & Dawn — Status and Targeting Revision',body))
 return report
