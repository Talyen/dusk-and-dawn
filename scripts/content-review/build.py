"""Build local design catalogues from individually reviewed, versioned recipes.
No game runtime is changed. All numbers remain playtest proposals.
"""
from pathlib import Path
from html.parser import HTMLParser
import json,re,html,hashlib,collections
ROOT=Path(__file__).resolve().parents[2];DOCS=ROOT/'docs';HERE=Path(__file__).parent
CARD='Dusk & Dawn — Card Effect Catalogue v0.2';ENEMY='Dusk & Dawn — Enemy Mechanics Catalogue v0.1';GAME='Dusk & Dawn — Game Design v0.2'
TYPES=['Radiance','Shadow','Growth','Decay','Binding','Release','Fire','Frost','Memory','Oblivion']
MECHANICS=['Ward','Burn','Poison','Flip','Banish','Scry','Bless','Curse','Freeze','Cleanse','Purge','Hush','Keep','Reflect','Leech']
COLORS={'Radiance': '#F7D670', 'Shadow': '#C7AEF1', 'Growth': '#9DDA97', 'Decay': '#C7CD78', 'Binding': '#80D1BE', 'Release': '#7DDDEC', 'Fire': '#FFAD66', 'Frost': '#A8E5FA', 'Memory': '#B8C7FF', 'Oblivion': '#C5C5CD', 'Ward': '#8BCBFF', 'Burn': '#FF966B', 'Poison': '#B2D67C', 'Flip': '#D8ABFF', 'Banish': '#F3A5B6', 'Scry': '#86D8D0', 'Bless': '#F5D58C', 'Curse': '#D4A2E4', 'Freeze':'#90CDEC', 'Cleanse':'#A4E5CF', 'Purge':'#F4B3A1', 'Hush': '#B5BCD1', 'Keep': '#B6E1A8', 'Reflect': '#9DDDFF', 'Leech': '#EF9EAC'}
BASELINE=ROOT/'test-results/content-review-baseline'
def readjson(p):return json.loads(p.read_text())
def writejson(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def keywords(s):return [k for k in MECHANICS+TYPES if re.search(r'\b'+k+r'\b',s)]
def mark(s):
 s=html.escape(s)
 return re.sub(r'\b('+'|'.join(MECHANICS+TYPES)+r')\b',lambda m:f'<span class="kw-{m[0].lower()}">{m[0]}</span>',s)
def styles():return '\n'.join(f'.kw-{k.lower()}{{color:{v};font-weight:650}}' for k,v in COLORS.items())
def normalize(s):
 s=s.replace('Flame damage','Fire damage').replace('draw pile','library')
 s=s.replace('from your discard to','from your discard pile to').replace('from your discard.','from your discard pile.')
 s=s.replace('from your discard on','from your discard pile on').replace('on your library.','on top of your library.')
 return s

def automatic_target_index(effect):
 out=[]
 patterns=[
  (r'Cleanse one random harmful status from yourself\.',{'op':'Cleanse','target':'random_harmful_self'}),
  (r'Cleanse all harmful statuses from yourself\.',{'op':'Cleanse','target':'all_harmful_self'}),
  (r'Purge one random beneficial status from the enemy\.',{'op':'Purge','target':'random_beneficial_enemy'}),
  (r'Purge all beneficial statuses from the enemy\.',{'op':'Purge','target':'all_beneficial_enemy'}),
  (r'Keep it\.',{'op':'Keep','target':'previous_Flip_target'}),
  (r'Turn the top card of your discard pile to its (light|dark) face\.',{'op':'Turn','target':'top_discard'}),
  (r'Keep this card\.',{'op':'Keep','target':'self'}),
  (r'Keep your hand\.',{'op':'Keep','target':'whole_hand'}),
  (r'Keep (a|\d+) random cards? in your hand\.',{'op':'Keep','target':'random_hand'}),
  (r'Flip this card\.',{'op':'Flip','target':'self'}),
  (r'Flip your hand\.',{'op':'Flip','target':'whole_hand'}),
  (r'Flip (a|\d+) random cards? in your hand\.',{'op':'Flip','target':'random_hand'}),
  (r'Flip the top card of your discard pile\.',{'op':'Flip','target':'top_discard'}),
  (r'Turn your hand to its (light|dark) faces\.',{'op':'Turn','target':'whole_hand'}),
  (r'Turn a random (dark|light) card in your hand to its (light|dark) face\.',{'op':'Turn','target':'random_opposite_face'})
 ]
 for pattern,base in patterns:
  for m in re.finditer(pattern,effect):
   row=dict(base,selection_prompts=0,at=m.start())
   if 'random' in row['target']:
    row['count']=1 if row['op'] in ['Cleanse','Purge'] or m[1] in ['a','light','dark'] else int(m[1]);row['without_replacement']=True
   if row['op'] in ['Cleanse','Purge']:row['unit']='status_kind';row['clear_entire_counter']=True
   if row['op']=='Turn':row['face']=m[2] if len(m.groups())==2 else m[1]
   out.append(row)
 return sorted(out,key=lambda x:x.pop('at'))

def cards():
 current=readjson(DOCS/(CARD+'.json'));old=readjson(BASELINE/(CARD+'.json')) if (BASELINE/(CARD+'.json')).exists() else current
 oldmap={c['face']:c for c in old};rows=[l.split('|',2) for l in (HERE/'cards-review.tsv').read_text().splitlines()]
 if len(rows)!=496:raise ValueError('Missing face judgments')
 evidence=[];result=[]
 flow_path=HERE/'flow-review.tsv'
 exceptions={int(r[0]):{'kind':r[1],'reason':r[2],'auto_if_forced':True} for r in (line.split('|',2) for line in flow_path.read_text().splitlines()) if r[1]!='automatic'} if flow_path.exists() else {}
 for n,effect,reason in rows:
  n=int(n);c=current[n-1].copy();original=readjson(HERE/'baseline.json')['card_effects'][c['face']];effect=normalize(original if effect=='=' else effect)
  c.pop('tags',None);c['effect']=effect;c['keywords']=keywords(effect);c['status']='proposed';c['automatic_targets']=automatic_target_index(effect)
  if n in exceptions:
   c['selection_exception']=dict(exceptions[n],automatic_when='zero_or_one_card' if exceptions[n]['kind']=='plan-route-order' else 'eligible_count_at_most_required_count',commitment='before_commit_visible_choice' if exceptions[n]['kind'] in ['choose-offering','recall-specific-card'] else 'after_commit_hidden_inspection')
  else:c.pop('selection_exception',None)
  result.append(c)
  evidence.append({'number':n,'face':c['face'],'artwork_id':c['artwork_id'],'before':original,'after':effect,'changed':original!=effect,'judgment':'strong-fit-proposal','reason':reason,'sheet':f'card-artwork-review/cards-{(n-1)//16+1:02}.jpg'})
 writejson(DOCS/(CARD+'.json'),result)
 return result,evidence,old

# Base operations use independently authored values. They never reference player-card IDs.
def atom(code,typ):
 if code.startswith('d') and code[1:].isdigit():return {'op':'damage','amount':int(code[1:]),'damage_type':typ,'hits':1}
 if code.startswith('w') and code[1:].isdigit():return {'op':'ward','amount':int(code[1:]),'target':'enemy'}
 if code.startswith('h') and code[1:].isdigit():return {'op':'heal','amount':int(code[1:]),'target':'enemy'}
 if code.startswith('s') and code[1:].isdigit():return {'op':'bless','amount':int(code[1:]),'target':'enemy'}
 if code.startswith('p') and code[1:].isdigit():return {'op':'curse','amount':int(code[1:]),'target':'player'}
 if code.startswith('q') and code[1:].isdigit():return {'op':'move_top','amount':int(code[1:]),'from':'player_draw','to':'player_banished'}
 if code in ['dark','light']:return {'op':'turn_after_draw','face':code,'target':'player'}
 raise ValueError(('base',code))
def trait_atoms(spec,typ):
 conditional=None
 if spec.startswith('ifburn:'):conditional='enemy_has_Burn_after_tick';spec=spec[7:]
 out=[]
 for code in spec.split(','):
  if code.startswith('bonus'):a={'op':'bonus_damage','amount':int(code[5:]),'damage_type':typ,'stage':'before_attack'}
  elif code.startswith('extra'):
   damage,count=map(int,code[5:].split('x'));a={'op':'extra_hits','amount':damage,'count':count,'damage_type':typ,'stage':'attack'}
  elif code.startswith('bypass'):a={'op':'ignore_ward','amount':'all' if code[6:]=='all' else int(code[6:]),'stage':'before_attack'}
  elif code.startswith('strip'):a={'op':'remove_ward','amount':int(code[5:]),'target':'player','stage':'before_attack'}
  elif code.startswith('curse'):a={'op':'curse','amount':int(code[5:]),'target':'player','stage':'after_attack'}
  elif code.startswith('bless'):a={'op':'bless','amount':int(code[5:]),'target':'enemy','stage':'after_attack'}
  elif code.startswith('poison'):a={'op':'poison','amount':int(code[6:]),'target':'player','stage':'after_attack'}
  elif code.startswith('burn'):a={'op':'burn','amount':int(code[4:]),'target':'player','stage':'after_attack'}
  elif code.startswith('heal'):a={'op':'heal','amount':int(code[4:]),'target':'enemy','stage':'after_attack'}
  elif code.startswith('ward'):a={'op':'ward','amount':int(code[4:]),'target':'enemy','stage':'after_attack'}
  elif code=='cleanpoison':a={'op':'remove_poison','target':'enemy','stage':'after_attack'}
  elif code=='clean':a={'op':'remove_burn','target':'enemy','stage':'after_attack'}
  elif code.startswith('mill'):a={'op':'move_top','amount':int(code[4:]),'from':'player_draw','to':'player_discard','stage':'after_attack'}
  elif code.startswith('bottom'):a={'op':'move_top','amount':int(code[6:]),'from':'player_draw','to':'player_draw_bottom','stage':'after_attack'}
  elif code.startswith('banish'):a={'op':'move_top','amount':int(code[6:]),'from':'player_draw','to':'player_banished','stage':'after_attack'}
  elif code.startswith('keptbanish'):a={'op':'move_held','amount':int(code[10:]),'to':'player_banished','chooser':'random','stage':'after_attack'}
  elif code.startswith('discard'):a={'op':'move_held','amount':int(code[7:]),'to':'player_discard','chooser':'random','stage':'after_attack'}
  elif code.startswith('stow'):a={'op':'move_held','amount':int(code[4:]),'to':'player_draw_top','chooser':'random','stage':'after_attack'}
  elif code.startswith('bury'):a={'op':'move_held','amount':int(code[4:]),'to':'player_draw_bottom','chooser':'random','stage':'after_attack'}
  elif code.startswith('flip'):a={'op':'flip_held','amount':'all' if code[4:]=='all' else int(code[4:]),'chooser':'random','stage':'after_attack'}
  elif code=='lightnow':a={'op':'turn_held','face':'light','stage':'after_attack'}
  elif code in ['dark','light']:a={'op':'turn_after_draw','face':code,'target':'player','stage':'after_attack'}
  elif code=='leech':a={'op':'leech','stage':'attack'}
  elif code.startswith('slow'):a={'op':'reduce_next_draw','amount':int(code[4:]),'target':'player','stage':'after_attack'}
  elif code.startswith('tax'):a={'op':'reduce_next_mana','amount':int(code[3:]),'target':'player','stage':'after_attack'}
  elif code.startswith('recur'):a={'op':'recover_to_top','amount':int(code[5:]),'chooser':'top_of_discard','stage':'after_attack'}
  elif code=='copy3to8':a={'op':'copy_latest_hit','minimum':3,'maximum':8,'fallback':3,'stage':'before_attack'}
  elif code=='mirror':a={'op':'reflect_once','stage':'while_intent_displayed'}
  elif code.startswith('thorn'):a={'op':'reaction_damage','amount':int(code[5:]),'damage_type':typ,'event':'after_player_direct_attack_card','stage':'while_intent_displayed'}
  else:raise ValueError(('trait',code))
  if conditional:a['condition']=conditional
  out.append(a)
 return out

def optext(a):
 op=a['op'];v=a.get('amount');who=a.get('target');s=''
 if op=='damage':s=f"Deal {v} {a['damage_type']} damage."
 elif op=='ward':s=f'Gain {v} Ward.'
 elif op=='heal':s=f'Heal {v} HP.'
 elif op=='bless':s=f'Gain {v} Bless.'
 elif op=='curse':s=f'Apply {v} Curse to the player.'
 elif op=='poison':s=f'Apply {v} Poison to the player.'
 elif op=='remove_poison':s='Remove all enemy Poison.'
 elif op=='burn':s=f'Apply {v} Burn to the player.'
 elif op=='bonus_damage':s=f"Add {v} {a['damage_type']} damage to the base hit."
 elif op=='extra_hits':s=f"Add {a['count']} {'hit' if a['count']==1 else 'hits'} of {v} {a['damage_type']} damage."
 elif op=='ignore_ward':s='The base hit ignores '+('all player Ward.' if v=='all' else f'up to {v} player Ward.')
 elif op=='remove_ward':s=f'Remove up to {v} player Ward before the base hit.'
 elif op=='remove_burn':s='Remove all enemy Burn.'
 elif op=='move_top':
  dest={'player_discard':"the player's discard pile",'player_draw_bottom':'the bottom of that pile','player_banished':'Banish'}[a['to']]
  noun='card' if v==1 else 'cards'
  s=(f'Banish the top {v} {noun} of the player\'s library.' if dest=='Banish' else f'Move the top {v} {noun} of the player\'s library to {dest}.')
 elif op=='move_held':
  subject='a random card' if v==1 else f'{v} random cards'
  tail='.' if v==1 else ', or all held cards if fewer.'
  where=" still in the player's hand"
  dest={'player_discard':"the player's discard pile",'player_draw_top':"the top of the player's library",'player_draw_bottom':"the bottom of the player's library",'player_banished':'Banish'}[a['to']]
  if dest=='Banish':s=f'Banish {subject}{where}'+tail
  else:s=f'Move {subject}{where} to {dest}'+tail
 elif op=='flip_held':s=('Flip all cards still in the player\'s hand.' if v=='all' else f'Flip {v} random card still in the player\'s hand, if any.')
 elif op=='turn_held':s=f"Turn the cards still in the player's hand to their {a['face']} faces."
 elif op=='turn_after_draw':s=f"After the player's next normal draw, turn their hand to its {a['face']} faces."
 elif op=='leech':s='The base attack has Leech.'
 elif op=='reduce_next_draw':s=f'The player draws {v} fewer card on their next normal draw.'
 elif op=='reduce_next_mana':s=f'The player starts their next turn with {v} less mana.'
 elif op=='recover_to_top':s=f'Move the top {v} card of the player\'s discard pile to the top of their library.'
 elif op=='copy_latest_hit':s='Use the latest direct hit\'s final damage this turn for the base hit: minimum 3, maximum 8. Use 3 if there was no direct hit.'
 elif op=='reflect_once':s='Reflect the first hit of the next direct card attack against this enemy. This ends when the hit is reflected or this intent ends.'
 elif op=='reaction_damage':s=f"After each of the player's direct attack cards, if this enemy survives, deal {v} {a['damage_type']} damage to the player. This is trait damage, not a base attack."
 else:raise ValueError(op)
 return s

def traittext(atoms,conditional=False):
 if conditional:
  assert [x['op'] for x in atoms]==['remove_burn','heal']
  return f"If the enemy has Burn after the tick, remove all its Burn and heal {atoms[1]['amount']} HP."
 return ' '.join(optext(x) for x in atoms)

def hush_text(action):
 if action['kind']=='ability':return 'Skip this ability. Advance the pattern.'
 return ' '.join(optext(x) for x in action['base'])+' Suppress the labeled trait. Advance the pattern.'

HEALTH=[42,24,48,48,48,32,36,28,18,28,24,32,26,28,48,28,28,26,30,24,36,24,28,24,28,24,30,28,30,36,30,30,28,42,30,30,26,28,24,30,36,48,30,30,26,30,36,22,26,36,36,30,28,24,36,24,30,28,26,36,26,34,28,30,26,24,30,36,26,28,26,24,36,30,34,36,28,24,26,36,30,28,32,24,34,30,26,30,26,42,32,28,28,28,26,26,36,26,36,32,28,26,26,24,24,36,28,42,26,30]

def enemies():
 current=readjson(DOCS/(ENEMY+'.json'))['enemies'];original=readjson(BASELINE/(ENEMY+'.json'))['enemies'] if (BASELINE/(ENEMY+'.json')).exists() else current
 original={x['number']:x for x in original};evidence=[];result=[]
 lines=[l.split('|') for l in (HERE/'enemies-review.tsv').read_text().splitlines()]
 for row in lines:
  n,tname,on,spec,an,ac,bn,bc,cn,cc,pattern,reason,typ=row;n=int(n);old=original[n];curr=current[n-1]
  actions=[]
  for key,label,code in [('a',an,ac),('b',bn,bc),('c',cn,cc)]:
   if label=='-':continue
   base=[atom(code,typ)];actions.append({'id':key,'name':label,'kind':'attack' if base[0]['op']=='damage' else 'ability','base':base,'effect':' '.join(optext(x) for x in base)})
  keyed={}
  if spec.startswith('a:'):
   for part in spec.split(';'):
    key,value=part.split(':',1);keyed[key]=trait_atoms(value,typ)
  else:
   for key in on:keyed[key]=trait_atoms(spec,typ)
  conditions={}
  for key,atoms in keyed.items():
   if any(x.get('condition') for x in atoms):conditions[key]='enemy_has_Burn_after_tick'
   for x in atoms:x.pop('condition',None)
  texts=[]
  for key,atoms in keyed.items():
   action=next(a for a in actions if a['id']==key);scope='While '+action['name']+' is shown: ' if any(x['stage']=='while_intent_displayed' for x in atoms) else 'On '+action['name']+': '
   texts.append(scope+traittext(atoms,key in conditions))
  trait={'name':tname,'effect':' '.join(texts),'by_action':keyed,'conditions_by_action':conditions}
  for a in actions:
   a['trait_active']=a['id'] in keyed;a['hush_target']=a['kind']=='ability' or a['trait_active'];a['hushed_effect']=hush_text(a) if a['hush_target'] else a['effect']+' No suppressible effect in this intent.'
   a['freeze_preview']='If Freeze is still active: skip this whole action and advance the pattern. Thaw conditions are undecided.'
   a['preview']=a['effect']+(' Trait — '+tname+': '+traittext(keyed[a['id']],a['id'] in conditions) if a['trait_active'] else '')
  pattern=list(pattern.replace(' ',''));assert all(k in [a['id'] for a in actions] for k in pattern)
  flags=[]
  if any(x['op'] in ['move_held','flip_held','turn_held'] for atoms in keyed.values() for x in atoms):flags.append('held-card-interaction')
  if any(x['op']=='move_top' and x['to']=='player_banished' or x['op']=='move_held' and x['to']=='player_banished' for a in actions for x in a['base']) or any(x['op'] in ['move_top','move_held'] and x['to']=='player_banished' for atoms in keyed.values() for x in atoms):flags.append('temporary-card-loss')
  if n in [59,95]:flags.append('reactive-trait')
  if n in [54,55,71,84,90,94]:flags.append('visible-next-turn-effect')
  if any(x['op'] in ['burn','poison'] for atoms in keyed.values() for x in atoms):flags.append('damage-over-time')
  if n in [26,105]:flags.append('helpful-trait')
  if n in [78]:flags.append('full-Ward-bypass')
  if any(x['op']=='heal' for a in actions for x in a['base']) or any(x['op'] in ['heal','leech'] for atoms in keyed.values() for x in atoms):flags.append('recovery-stall-check')
  weak=old['weakness'].copy();weak['type']='Fire' if weak['type']=='Flame' else weak['type'];weak.pop('available_direct_face_count',None);weak.pop('example_direct_faces',None)
  r={'id':old['id'],'number':n,'name':old['name'],'status':'proposal-not-playtested','health':HEALTH[n-1],
     'artwork':old['artwork'],'weakness':weak,'trait':trait,'actions':actions,'pattern':pattern,
     'keywords':keywords(' '.join([trait['effect']]+[a['effect'] for a in actions]+[weak['type']])),'review_flags':flags,'thematic_reason':reason}
  result.append(r);evidence.append({'number':n,'name':r['name'],'judgment':'strong-fit-proposal','reason':reason,'before_trait':readjson(HERE/'baseline.json')['enemy_traits'][str(n)],'after_trait':trait['effect'],'actions':[a['preview'] for a in actions],'sheet':'enemy-artwork-review/'+Path(old['artwork']['contact_sheet']).name})
 return result,evidence,list(original.values())

if __name__=='__main__':
 cs,cr,oldc=cards();es,er,olde=enemies()
 (ROOT/'test-results').mkdir(exist_ok=True)
 writejson(ROOT/'test-results/Content Review Working Data.json',{'cards':cr,'enemies':er,'enemies_revised':es})
 print('Prepared 496 reviewed card effects and 110 enemy action pools.')
