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
