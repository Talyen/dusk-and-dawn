"""Focused design-data validation; not a combat simulation or playtest."""
from build import *
from render import RULES,THOUGHTS,ImageCache
from urllib.parse import unquote,urlsplit
import base64,io
from PIL import Image

checks=[]
def check(condition,label):
 if not condition:raise AssertionError(label)
 checks.append(label)

class Document(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.effects=[];self.capture=None;self.parts=[];self.links=[];self.ids=[];self.entries=collections.Counter()
 def handle_starttag(self,t,a):
  d=dict(a)
  if 'id' in d:self.ids.append(d['id'])
  for k in ['href','src']:
   if k in d:self.links.append(d[k])
  for c in d.get('class','').split():self.entries[c]+=1
  if t=='td' or t=='p':
   if 'data-face' in d:self.capture=d['data-face'];self.parts=[]
 def handle_data(self,s):
  if self.capture is not None:self.parts.append(s)
 def handle_endtag(self,t):
  if t in ['td','p'] and self.capture is not None:self.effects.append((self.capture,''.join(self.parts)));self.capture=None

def validate():
 cs=readjson(DOCS/(CARD+'.json'));root=readjson(DOCS/(ENEMY+'.json'));es=root['enemies'];review=readjson(DOCS/'Full Content Review v0.1.json');rules=readjson(DOCS/'Effect Rules v0.1.json')
 check(len(cs)==496 and len({c['face'] for c in cs})==496,'496 unique canonical faces')
 pairs=collections.defaultdict(list)
 for c in cs:pairs[c['pair']].append(c)
 check(len(pairs)==248 and all(len(p)==2 and {x['side'] for x in p}=={'light','dark'} for p in pairs.values()),'248 physical pairs with one face per side')
 check(all(c['cost']==1 and 'tags' not in c and c['keywords']==keywords(c['effect']) for c in cs),'costs and keywords derive only from complete descriptions; no tags')
 check(all('discard.' not in c['effect'] and 'from your discard to' not in c['effect'] for c in cs),'discard pile wording normalized')
 for c in cs:
  text=c['effect'];damage=re.findall(r'Deal (\d+) (\w+) damage',text)
  check(all(t in TYPES for _,t in damage),c['face']+': every direct hit has one allowed damage type')
  if 'Gain 1 mana' in text:check('Banish this card.' in text,c['face']+': mana gain source banishes')
 check([c['face'] for c in cs if 'Leech' in c['keywords']]==['Vampire','Vampire Countess','Bat','Deep Sea Dragonfish'],'only four individually reviewed feeding attacks use Leech')
 check(all('Banish this card.' in c['effect'] for c in cs if 'Hush' in c['keywords']),'all Hush sources banish')
 check(len(es)==110 and [e['number'] for e in es]==list(range(1,111)) and len({e['id'] for e in es})==110,'110 sequential unique enemies')
 check(sum(len(e['actions']) for e in es)==243,'243 independently authored actions')
 reactive=[]
 for e in es:
  acts={a['id']:a for a in e['actions']};keys=set(acts);trait=e['trait'];atoms=[x for aa in trait['by_action'].values() for x in aa]
  check(len(acts) in [2,3] and set(e['pattern'])==keys and e['health']>0,e['name']+': all pool actions used by a positive-health encounter')
  check('theme' not in e and 'resistance' not in e and e['weakness']['direct_card_bonus']==2 and e['weakness']['type'] in TYPES,e['name']+': explicit typed weakness and no theme/resistance')
  avail=[c['face'] for c in cs if re.search(r'Deal \d+ '+e['weakness']['type']+r' damage',c['effect'])]
  check(len(avail)==e['weakness']['available_direct_face_count']>0,e['name']+': weakness has actual direct attacks')
  check(set(trait['by_action'])<=keys and any(a['hush_target'] for a in acts.values()) and any(a['kind']=='attack' for a in acts.values()),e['name']+': valid trait scope, attack, and Hush window')
  for a in acts.values():
   if a['kind']=='attack':check(all(x['op']=='damage' and x['damage_type'] in TYPES for x in a['base']) and a['effect'] in a['hushed_effect'],e['name']+'/'+a['id']+': Hush preserves typed base hits')
   else:check(a['hushed_effect']=='Skip this ability. Advance the pattern.',e['name']+'/'+a['id']+': Hush skips ability and advances')
   check(a['trait_active']==(a['id'] in trait['by_action']),e['name']+'/'+a['id']+': trait preview scope agrees')
  if any(x['stage']=='while_intent_displayed' for x in atoms):reactive.append(e['number'])
 check(reactive==[59,95],'only two explicitly scoped reactive traits')
 check(es[5]['trait']['conditions_by_action']=={'b':'enemy_has_Burn_after_tick'} and all('condition' not in x for x in es[5]['trait']['by_action']['b']),'Lantern Eater checks Burn once for grouped clear and heal')
 current=' '.join([c['effect'] for c in cs]+[e['trait']['effect'] for e in es]+[a['effect'] for e in es for a in e['actions']])
 check(not re.search(r'HP actually lost|damage reached HP|damage to HP this turn|previous turn|snapshot',current),'canonical effects contain no health-layer or hidden prior-turn tracking triggers')
 check(rules['keyword_rules']==RULES and rules['no_separate_theme_tags'] and rules['damage_types']==TYPES,'structured rule contract matches generation source')
 check(len(review['cards'])==496 and len(review['enemies'])==110 and all(x['reason'] and x['judgment']=='strong-fit-proposal' for x in review['cards']+review['enemies']),'606 individual thematic judgments and rationales')
 byface={c['face']:c['effect'] for c in cs}
 for name in [CARD+'.html',ENEMY+'.html',GAME+'.html','Full Content Review v0.1.html']:
  path=DOCS/name;s=path.read_text();doc=Document();doc.feed(s)
  check(len(doc.ids)==len(set(doc.ids)),name+': unique HTML IDs')
  check(all(byface.get(n)==eff for n,eff in doc.effects),name+': embedded face examples match canonical text')
  for link in doc.links:
   parts=urlsplit(link)
   if parts.scheme or parts.netloc or not parts.path:continue
   check((path.parent/unquote(parts.path)).exists(),name+': local link exists '+unquote(parts.path))
  check('/Documents/' not in s and 'class="tag"' not in s and '&lt;a href=' not in s,name+': portable references, no theme chips or escaped links')
  if name==CARD+'.html':check(len(doc.effects)==496 and doc.entries['pair']==248,'card HTML contains all paired canonical descriptions')
  if name==ENEMY+'.html':
   check(doc.entries['enemy']==110,'enemy HTML contains 110 entries')
   cache=ImageCache();cache.feed(s);check(set(cache.images)=={e['id'] for e in es},'110 embedded thumbnails match enemy IDs')
   for src in cache.images.values():
    data=base64.b64decode(src.split(',',1)[1]);im=Image.open(io.BytesIO(data));im.verify()
   check(True,'all 110 embedded thumbnail images decode')
 for filename,count,dirkey,filekey in [('Card Artwork Coverage v0.1.json',496,'Artwork','file'),('Enemy Artwork Coverage v0.1.json',110,'Enemy Artwork','source_filename')]:
  cov=readjson(DOCS/filename);inv=cov['artwork_inventory'];art=Path('/Users/ryanmcintire/Google Drive/My Drive/Dusk & Dawn')/dirkey
  check(cov['inspected_count']==count and len(inv)==count and not cov['uninspected'],filename+': complete recorded visual coverage')
  check({x[filekey] for x in inv}=={p.name for p in art.glob('*.png')},filename+': exact source artwork set')
  check(all(sha(art/x[filekey])==x['sha256'] for x in inv),filename+': source hashes unchanged')
  check(all(sha(DOCS/x['path'])==x['sha256'] for x in cov['contact_sheet_files']),filename+': portable contact-sheet references and hashes')
  check(len(cov['contact_sheet_files'])==(31 if count==496 else 10),filename+': expected contact-sheet count')
 # Independent arithmetic examples: focused boundary checks, not a battle simulator.
 examples={}
 def example(name,actual,expected):check(actual==expected,'arithmetic: '+name);examples[name]={'result':actual,'expected':expected}
 example('Moth Sun hit',18-6,12)
 example('Dentist extraction against five Ward',max(0,4-max(0,5-5)),4)
 example('Hushed Dentist against five Ward',max(0,4-5),0)
 example('Weaken choir first hit only',[max(0,2-3),2,2],[0,2,2])
 example('Weakened choir through three Ward',max(0,sum([0,2,2])-3),1)
 example('Leech final before Ward',min(30,26+4+2),30)
 example('Leech after Weaken',max(0,4+2-3),3)
 example('Reflected same final hit through attacker Ward',max(0,6-2),4)
 example('Prism weakness and Mark once',[2+2+3,2,2],[7,2,2])
 example('Burn tick precedes mouth condition',3-1,2)
 example('Mana tax expires after refill',[3-1,3],[2,3])
 example('hand cap after three kept cards',min(5,8-3),5)
 example('hand cap after five kept cards',min(5,8-5),3)
 example('Key opener in ten cards',round((1-__import__('math').comb(8,5)/__import__('math').comb(10,5))*100),78)
 example('Key opener in fourteen cards',round((1-__import__('math').comb(12,5)/__import__('math').comb(14,5))*100),60)
 out={'status':'passed','date':'2026-11-03','check_count':len(checks),'checked':checks,'arithmetic_examples':examples,'limitations':['Static document/data validation and arithmetic boundary cases only.','Not a combat engine, simulation, human playtest, or full-resolution art review.','Local-file browser preview denied by policy; no workaround attempted. Rendering and interactive filters unverified.'],'counts':review['counts']}
 writejson(DOCS/'Content Validation v0.1.json',out)
 print(f"PASS: {len(checks)} focused checks, 606 source-artwork hashes, 41 sheets, 110 embedded thumbnails; no playtest claim.")

if __name__=='__main__':validate()
