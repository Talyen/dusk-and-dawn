"""Focused reference model for proposed status/target timing, not game runtime."""
from dataclasses import dataclass

def halve(value):
 if not isinstance(value,int) or isinstance(value,bool) or value<0:raise ValueError('Status amounts must be nonnegative integers')
 return value//2

def apply_dot(current,incoming):
 halve(current);halve(incoming)
 return max(current,incoming)

def tick_sequence(value):
 out=[]
 while value:
  out.append(value);value=halve(value)
 return out

@dataclass
class Combatant:
 hp:int=30
 ward:int=0
 burn:int=0
 poison:int=0
 def begin_turn(self):self.ward=halve(self.ward)
 def dots(self):
  events=[]
  for name,typ in [('burn','Fire'),('poison','Decay')]:
   value=getattr(self,name)
   if value==0:continue
   absorbed=min(self.ward,value);self.ward-=absorbed;self.hp=max(0,self.hp-value+absorbed)
   setattr(self,name,halve(value));events.append({'status':name,'type':typ,'damage':value,'absorbed':absorbed})
   if self.hp==0:break
  return events

def end_turn_dots(player,enemy):
 if player.hp<=0 or enemy.hp<=0:return []
 events=[('player',e) for e in player.dots()]
 if player.hp>0:events += [('enemy',e) for e in enemy.dots()]
 return events

@dataclass
class Card:
 id:str
 face:int=0
 kept:bool=False

def automatic_targets(hand,mode,rng=None,count=1,source=None,discard=None,target_face=None):
 if mode=='self':return [source] if source is not None else []
 if mode=='hand':return list(hand)
 if mode=='top_discard':return list(discard[-1:]) if discard else []
 if mode=='random_opposite_face':
  eligible=[c for c in hand if c.face!=target_face]
  return rng.sample(eligible,min(count,len(eligible)))
 if mode=='random':return rng.sample(hand,min(count,len(hand)))
 raise ValueError(mode)

def keep_source(source,hand,cap=8):
 if any(x is source for x in hand):raise ValueError('Source must be resolving outside the hand')
 if len(hand)>=cap:return False
 source.kept=True;hand.append(source);return True

class ScryView:
 def __init__(self):self.active=False
 def enable(self):self.active=True
 def visible(self,library):return library[0] if self.active and library else None
 def end_turn(self):self.active=False

# Explicit candidate models: no numerical model is silently selected here.
def add_stacks(current,incoming):
 halve(current);halve(incoming)
 return current+incoming

def attack_damage(hits,bless,curse,model,weakness=0):
 halve(bless);halve(curse);halve(weakness)
 values=[v+(weakness if i==0 else 0) for i,v in enumerate(hits)]
 if model=='flat':return [max(0,v+bless-curse) for v in values]
 if model=='percent25_nearest':
  quarters=max(0,min(8,4+bless-curse))
  return [(v*quarters+2)//4 for v in values]
 raise ValueError('Choose an explicit candidate model; the final scaling decision is open')

def remove_statuses(statuses,eligible,quantity,rng):
 pool=sorted(k for k in statuses if k in eligible and statuses[k])
 if quantity=='all':chosen=pool
 elif quantity=='one_random':chosen=[rng.choice(pool)] if pool else []
 else:raise ValueError('Quantity must explicitly be all or one_random')
 for k in chosen:statuses.pop(k)
 return chosen

def frozen_action(frozen,intervening_event=None):
 if frozen and intervening_event in ['direct_attack','Fire']:
  return {'outcome':'unresolved','reason':'thaw behavior has not been approved'}
 return {'outcome':'skip' if frozen else 'act','advance':True,'clear_Freeze':bool(frozen)}

def resolve_attack_statuses(statuses,hits,model,weakness=0):
 result=attack_damage(hits,statuses.get('Bless',0),statuses.get('Curse',0),model,weakness)
 statuses.pop('Bless',None);statuses.pop('Curse',None)
 return result

def reverse_top(library,count):
 halve(count)
 library[:count]=reversed(library[:count])

def fixed_discard_targets(discard,count,position='top',space=None):
 halve(count)
 if count==0:return []
 block=discard[-count:] if position=='top' else discard[:count]
 ordered=list(reversed(block))
 return ordered if space is None else ordered[:max(0,space)]

def exchange_random_with_discard(hand,discard,position,rng):
 if not hand or not discard:return None
 out=rng.choice(hand);incoming=discard[-1] if position=='top' else discard[0]
 # Select both from their original zones before either enters the other zone.
 hand[hand.index(out)]=incoming;discard[discard.index(incoming)]=out
 return out,incoming

def finish_source(source,piles):
 # A source explicitly moved elsewhere must not also enter discard.
 def same(items):return any(x is source for x in items)
 for zone in ['hand','library','banished','discard']:
  if same(piles.get(zone,[])):
   piles['resolving'][:]=[x for x in piles.get('resolving',[]) if x is not source]
   return zone
 if same(piles.get('resolving',[])):
  piles['resolving'][:]=[x for x in piles['resolving'] if x is not source]
  piles.setdefault('discard',[]).append(source)
  return 'discard'
 return None
