"""Individual review of every formerly flagged incidental selection effect."""
from build import *
from scaling_review import prompt_flags

EXCEPTION_IDS={23,91,107,126,156,251}

def produce_flow_review(cs,es):
 from render import page,p,ul,section
 baseline=readjson(HERE/'flow-baseline.json');recipes=[r.split('|',2) for r in (HERE/'flow-review.tsv').read_text().splitlines()]
 assert {int(r[0]) for r in recipes}==set(baseline['review_numbers']) and len(recipes)==122
 entries=[]
 for num,kind,reason in recipes:
  n=int(num);c=cs[n-1];exception=kind!='automatic'
  entries.append({'number':n,'face':c['face'],'pair':c['pair'],'before':baseline['effects'][c['face']],'after':c['effect'],'changed':baseline['effects'][c['face']]!=c['effect'],'judgment':'strong-fit-proposal','reason':reason,'selection_exception':exception,'exception_kind':None if not exception else kind,'current_selection_flags':prompt_flags(c['effect']),'sheet':f'card-artwork-review/cards-{(n-1)//16+1:02}.jpg'})
 remaining=[{'number':i,'face':c['face'],'effect':c['effect'],'flags':prompt_flags(c['effect'])} for i,c in enumerate(cs,1) if prompt_flags(c['effect'])]
 assert {r['number'] for r in remaining}==EXCEPTION_IDS
 operations={
  'self_return':'Revenant: deal 3 Shadow, then self-Keep. Replays still cost mana; a later Flip can expose Winged Guardian, and playing that face loses the marker normally.',
  'self_move_to_library':'Descent, Divergence, Smuggler and Spiral Well move their own resolving source to library bottom before drawing. The source must not also enter discard at completion. An otherwise empty library may make it its own draw; this creates no copy or free play.',
  'whole_hand_move':'Repulsion and Dandelion send the hand to library bottom, then draw 3; Funnel queues the hand on top and draws 1. Preserve existing hand order. The resolving source is excluded.',
  'fixed_discard_moves':'Top/bottom mean current pile positions. Bottom is not an age or prior-turn identity counter. Discard cards are face up; show exact fixed recipients in previews.',
  'fixed_group_order':'Transfer a pile block in its existing top-to-bottom order. A top-2 discard return presents the current top first. Move only what fits in hand and leave excess in its original zone. Selected and unselected inspection groups preserve original library order.',
  'fixed_face_restoration':'Doll Mender and Crown Jeweler turn the top discarded card to its light face, then return that same physical card. Light is its encounter-starting form here, not a moral label.',
  'reverse_library_block':'Metronome reverses the available top 2; Music Conductor and Hedge Garden reverse the top 3. Preserve faces and lower cards. Use the available block; normal empty-library preparation applies once, with no mid-inspection reshuffle. Never reveal unknown identities in an unpaid preview.',
  'random_exchange':'Tidal Causeway swaps a random held card with discard top; Tide Wanderer uses discard bottom. Pick the outgoing card from the original hand before the incoming card arrives. Require both sides and exchange atomically.',
  'related_target':'Marionette flips one random held card, then Keeps that same target. “It” is a temporary reference within this resolution, not prior-turn tracking. An empty pool makes both clauses do nothing.',
  'payments_and_commitment':'Initial discard or Banish of a non-source card before a payoff is a required payment, whether fixed, random or chosen, and needs an eligible card. The resolving source is excluded from “another”. Check availability without rolling or shuffling; commit before determining a random payment or unseen top. Visible choice payments can be canceled before commitment. Non-payment clauses use available cards and can resolve empty; payments cannot be underpaid. Check that before automatic forced selection.',
  'hidden_inspection_exceptions':'Cartographer, Wilderness, Loaded Dice and Sieve commit their cost before revealing hidden cards. No refund after information is shown. Selecting all available cards is automatic; ordering needs a choice only when at least two cards exist.',
  'self_Keep_cap':'Water Clock draws before self-Keep. At the cap the draw can fill the vacated slot, causing self-Keep to fail and the source to discard. Preview that outcome. Other self-Keep sources in this catalogue do not fill their vacated slot before returning.'
 }
 risks=[
 'Numbers are proposals, not preserved balance. Revenant changes from a 5-damage recovery engine to a repeatable 3-damage self-return. Water Clock becomes repeatable paid draw. Test both against the three-mana limit and hand cap.',
 'Several dangerous hand sacrifices now spend the depicted source itself; some consume a specific visible discarded remnant. Locust and Path Eraser deliberately consume the next library card. Earlier Scry or draws can protect a valuable next card, but a hidden top remains a real cost.',
 'Fixed top/bottom recovery makes play order matter and removes search menus, but may create cheap recursion cycles. Memory retains one unrestricted retrieval as a Banish source. Test repeated recovery and group returns without claiming they are balanced.',
 'Six deliberate exceptions remain. They are whole-card decisions, not rider prompts. If a visible selection has only one possible recipient, take it automatically. Hidden inspection pays before revealing; cancellation cannot become free scouting.',
 'No general light-good/dark-bad rule is added. Two crafts restore the encounter-starting face because repair is their depicted action. Other dark faces remain protective, restorative or useful.',
 'Bless/Curse scaling and Freeze thaw are unchanged and unresolved. All new flow math is independent of choosing a scaling model. Application code is untouched; implementation must support the listed operations before these documents are treated as executable content.'
 ]
 counts={'reviewed_formerly_flagged_faces':122,'automatic_reworks':sum(not r['selection_exception'] for r in entries),'deliberate_selection_exceptions':sum(r['selection_exception'] for r in entries),'changed_descriptions':sum(r['changed'] for r in entries),'total_current_faces':496,'current_faces_with_selection_flags':len(remaining),'all_enemy_entries_checked':len(es),'new_application_files_changed':0}
 report={'source_commit':baseline['source_commit'],'status':'isolated document proposal for implementation coordination; not playtested','counts':counts,'entries':entries,'remaining_exceptions':remaining,'implementation_operations':operations,'balance_and_review_risks':risks,'preserved_open_decisions':{'Bless_Curse_scaling':None,'Freeze_thaw_on_attack':None,'Freeze_thaw_on_Fire':None},'limits':['Prior contact-sheet artwork inspection remains the visual evidence; source art hashes are rechecked.','Reference-model and document consistency only; no complete combat simulation or human playtest.','This pass is isolated from the separately running application implementation.']}
 writejson(DOCS/'Card Flow Review v0.1.json',report)
 body='<header><p class="eyebrow">Dusk & Dawn · individual flow review</p><h1>Choose cards and their order.</h1><p>All 122 formerly flagged faces were reviewed individually. 116 now avoid selections; six deliberately retain a meaningful choice. Fixed targets, self-actions, automatic exchanges and thematic rewrites replace the former menus.</p><p class="notice">Design proposals only. Application code is unchanged. Bless/Curse scaling and Freeze thaw remain open. Coordinate this isolated data change with implementation.</p></header>'
 body+=section('coverage','Coverage and exceptions',ul([k.replace('_',' ')+': '+str(v) for k,v in counts.items()])+ul([r['face']+' — '+next(x['reason'] for x in entries if x['number']==r['number']) for r in remaining]))
 body+=section('operations','Rules and implementation operations',''.join('<h3>'+html.escape(k.replace('_',' ').capitalize())+'</h3>'+p(v) for k,v in operations.items()))
 body+=section('risks','Balance and review limits',ul(risks))
 body+='<section class="section"><h2>All 122 individual judgments</h2><div class="table-wrap"><table><thead><tr><th>Face</th><th>Before</th><th>Current proposal</th><th>Reason</th></tr></thead><tbody>'+''.join('<tr><th>'+html.escape(r['face'])+'</th><td>'+mark(r['before'])+'</td><td>'+mark(r['after'])+'</td><td>'+html.escape(r['reason'])+'</td></tr>' for r in entries)+'</tbody></table></div></section>'
 body+='<footer><a href="'+__import__('urllib.parse',fromlist=['quote']).quote(GAME+'.html')+'">Design</a> · <a href="Bless%20Curse%20and%20Control%20Review%20v0.1.html">Scaling and control review</a> · companion JSON contains every judgment and operation.</footer>'
 (DOCS/'Card Flow Review v0.1.html').write_text(page('Dusk & Dawn — Card Flow Review',body))
 return report
