"""Compare unresolved scaling candidates and audit incidental selection prompts."""
from build import *
from rules_contract import STATUS_POLICY
from status_model import attack_damage

def prompt_flags(effect):
 out=[]
 if re.search(r'Banish another card|Discard a card|Put another card|Put up to \d+ other cards',effect):out.append('choose-held-card')
 if re.search(r'(?:Banish|Return|return|Put) (?:a card|up to \d+ cards) from your discard pile',effect):out.append('choose-discarded-card')
 if 'Exchange a card' in effect:out.append('choose-two-zone-targets')
 if 'Look at the top' in effect:out.append('inspection-selection-or-order')
 if 'in any order' in effect and 'inspection-selection-or-order' not in out:out.append('order-cards')
 if 'of your choice' in effect and not out:out.append('explicit-card-choice')
 return out

def produce_scaling_review(cs,es):
 from render import page,p,ul,section
 baseline=readjson(HERE/'stacking-baseline.json')
 samples=[1,2,3,4,5,6,7,8,9,10,11]
 table=[{'base_hit':n,'flat_Bless1':attack_damage([n],1,0,'flat')[0],'percent25_Bless1':attack_damage([n],1,0,'percent25_nearest')[0],'flat_Curse1':attack_damage([n],0,1,'flat')[0],'percent25_Curse1':attack_damage([n],0,1,'percent25_nearest')[0]} for n in samples]
 examples=[]
 for name,hits in [('Prism',[2,2,2]),('Porcelain Choir · Chorus',[2,2,2]),('Golden Millipede · March',[3,1,1,1,1]),('Large printed card hit',[11])]:
  examples.append({'name':name,'base_hits':hits,'flat_Bless1':attack_damage(hits,1,0,'flat'),'percent25_Bless1':attack_damage(hits,1,0,'percent25_nearest'),'flat_Curse1':attack_damage(hits,0,1,'flat'),'percent25_Curse1':attack_damage(hits,0,1,'percent25_nearest'),'percent25_Curse2':attack_damage(hits,0,2,'percent25_nearest')})
 audits=[{'number':i,'face':c['face'],'effect':c['effect'],'flags':prompt_flags(c['effect'])} for i,c in enumerate(cs,1)]
 remaining=[x for x in audits if x['flags']]
 enemy_prompts=[]
 for e in es:
  if 'of their choice' in e['trait']['effect'] or any('of their choice' in a['effect'] for a in e['actions']):enemy_prompts.append(e['name'])
 decisions=[
 'Approved: Bless and Curse are stacking buff/debuff counters affecting every hit of the next direct attack. Mark and Weaken are removed from current effects and rules. Applications add, non-attacks preserve counters, and the next attack spends all of both even if damage is zero.',
 'Recommendation: flat +1/−1 per stack, with minimum final damage 0 and no extra counter or damage cap. Current mana, cards and one-attack consumption bound individual uses; that is not proof of balance. Stack counts were conservatively retuned to mostly 1–2, with 3 on a few Banish sources. These are provisional counts, not a conversion formula to preserve old balance.',
 'The numerical decision is OPEN. Current catalogue previews explicitly use the flat candidate as a working proposal. No percentage rate, rounding mode or percentage cap is approved.',
 'Comparison candidate only: each stack adds or subtracts 25 percentage points. Combine Bless minus Curse, clamp the multiplier between 0× and 2×, then round each final hit to nearest integer with half ties upward. Do not compound multipliers. This permits meaningful comparison without selecting it as the rule.',
 'Low hit sizes make percentage steps uneven. Nearest rounding leaves 2-damage hits unchanged under Curse 1; the Millipede gets the same 6 total under Curse 1 and Curse 2. Rounding down instead can erase 1-damage hits with one stack while making small Bless bonuses invisible. Rounding up reverses that bias. Fractional carry or attack-total redistribution could fix some thresholds but adds hidden arithmetic and order rules.',
 'Flat scaling deliberately rewards or counters many-hit attacks. Bless 1 adds 3 total to Prism but 1 to a single hit; Curse 1 removes 5 total from the Millipede when it has five positive hits. Test these interactions with Leech, reflection, Banish thinning and repeated draw/recovery.',
 'Curse can reduce direct hits to 0, but separate Burn, Poison, card movement, healing and trait clauses still happen. Freeze controls the entire action; Hush suppresses the labeled trait and skips non-attack abilities. Those remain distinct even when Curse prevents all direct damage.',
 'Freeze control is approved. Its thaw rule is OPEN: whether direct attacks and/or Fire end it is not defined. Preview only the conditional case “if still Frozen at action start, skip the whole action, advance and clear”. Do not treat earlier breakable-freeze proposals, or a no-thaw alternative, as a settled rule.',
 'Cleanse and Purge explicitly remove one random eligible kind or all eligible kinds. Random is uniform by active kind, not stack amount; clear the whole chosen counter. No target menu. Typed narrow cures and partial Ward removal remain separate when those better fit the subject.',
 'The main player decisions are which cards to play and in what order. Enemy held-card moves now choose random recipients; helpful recovery uses the top discarded card. The dedicated card-flow pass reviews all 122 former flags. The remaining deliberate exceptions below are documented in that pass; risky random Banish was not used as a blanket replacement.'
 ]
 counts={'card_faces_checked':len(cs),'enemies_checked':len(es),'changed_card_descriptions_since_previous_commit':sum(baseline['cards'][c['face']]!=c['effect'] for c in cs),'enemy_entries_with_effect_text_changes':sum(baseline['enemies'][str(e['number'])]['trait']!=e['trait']['effect'] or baseline['enemies'][str(e['number'])]['actions']!=[a['preview'] for a in e['actions']] for e in es),'conditional_Freeze_previews':sum(len(e['actions']) for e in es),'Bless_faces':sum('Bless' in c['keywords'] for c in cs),'Curse_faces':sum('Curse' in c['keywords'] for c in cs),'Freeze_faces':sum('Freeze' in c['keywords'] for c in cs),'Cleanse_faces':sum('Cleanse' in c['keywords'] for c in cs),'Purge_faces':sum('Purge' in c['keywords'] for c in cs),'remaining_card_faces_with_selection_flags':len(remaining),'remaining_enemy_selection_prompts':len(enemy_prompts)}
 report={'source_commit':baseline['source_commit'],'status':'design proposal; scaling and thaw decisions open','directions_and_recommendations':decisions,'status_policy':STATUS_POLICY,'counts':counts,'single_hit_comparison':table,'actual_attack_examples':examples,'selection_audit':audits,'remaining_enemy_prompts':enemy_prompts,'limitations':['Reference-model arithmetic and static consistency only; no complete combat simulation or human playtest.','Percentage parameters are comparison assumptions, not approval.','Freeze sequences with an intervening attack or Fire cannot receive a final outcome until thaw is chosen.','Older incidental card choices are flagged, not all redesigned.']}
 writejson(DOCS/'Bless Curse and Control Review v0.1.json',report)
 body='<header><p class="eyebrow">Dusk & Dawn · approved directions, open numbers</p><h1>Bless, Curse and control</h1><p class="notice">Bless/Curse scaling is undecided. Flat values are explicitly provisional previews. Freeze thaw from attacks or Fire is undecided. Mark and Weaken are retired from current rules and effects.</p></header>'
 body+=section('directions','Directions and recommendations',ul(decisions))
 body+=section('counts','All-content coverage',ul([k.replace('_',' ')+': '+str(v) for k,v in counts.items()]))
 body+='<section class="section"><h2>Flat versus percentage · one stack</h2><p>No weakness or other modifiers. Percentage columns use the comparison-only 25% rate, nearest rounding with half ties up, and 0–2× bounds.</p><div class="table-wrap"><table><thead><tr><th>Printed hit</th><th>Flat Bless</th><th>25% Bless</th><th>Flat Curse</th><th>25% Curse</th></tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+str(r[k])+'</td>' for k in ['base_hit','flat_Bless1','percent25_Bless1','flat_Curse1','percent25_Curse1'])+'</tr>' for r in table)+'</tbody></table></div></section>'
 body+='<section class="section"><h2>Actual attack patterns</h2><div class="table-wrap"><table><thead><tr><th>Example</th><th>Base</th><th>Flat Bless 1</th><th>25% Bless 1</th><th>Flat Curse 1</th><th>25% Curse 1</th><th>25% Curse 2</th></tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(str(r[k]))+'</td>' for k in ['name','base_hits','flat_Bless1','percent25_Bless1','flat_Curse1','percent25_Curse1','percent25_Curse2'])+'</tr>' for r in examples)+'</tbody></table></div></section>'
 body+=section('prompts','Deliberate selection exceptions after the card-flow review',p('These require card selection, inspection decisions or ordering. These are the documented deliberate exceptions retained after the individual card-flow review.')+'<div class="table-wrap"><table><thead><tr><th>Face</th><th>Current effect</th><th>Selection flags</th></tr></thead><tbody>'+''.join('<tr><th>'+html.escape(r['face'])+'</th><td>'+mark(r['effect'])+'</td><td>'+html.escape(', '.join(r['flags']))+'</td></tr>' for r in remaining)+'</tbody></table></div>')
 body+='<footer><a href="'+__import__('urllib.parse',fromlist=['quote']).quote(GAME+'.html')+'">Current design</a> · <a href="Effect%20Rules%20v0.1.json">Structured rules</a> · no full balance or fun claim.</footer>'
 (DOCS/'Bless Curse and Control Review v0.1.html').write_text(page('Dusk & Dawn — Bless Curse and Control Review',body))
 return report
