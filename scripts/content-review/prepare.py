from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json,hashlib,textwrap
ROOT=Path(__file__).resolve().parents[2]
ART=Path('/Users/ryanmcintire/Google Drive/My Drive/Dusk & Dawn/Artwork')
cards=json.loads((ROOT/'docs/Dusk & Dawn — Card Effect Catalogue v0.2.json').read_text())
files=list(ART.glob('*.png')); byname={p.name:p for p in files};matches=[]
for i,c in enumerate(cards,1):
 name=f"{c['pair']} - {c['face']}.png"
 if name not in byname:raise ValueError((i,name))
 matches.append(byname[name])
assert len(matches)==len(set(matches))==496
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',15)
small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',13)
out=ROOT/'docs/card-artwork-review';out.mkdir(exist_ok=True)
manifest=[]
for b in range(0,len(cards),16):
 sheet=Image.new('RGB',(1280,1940),'#eeeeee');d=ImageDraw.Draw(sheet)
 for j,(c,p) in enumerate(zip(cards[b:b+16],matches[b:b+16])):
  im=Image.open(p);x=(j%4)*320;y=(j//4)*485
  thumb=ImageOps.contain(im.convert('RGB'),(312,397));sheet.paste(thumb,(x+(312-thumb.width)//2,y))
  d.text((x+6,y+399),f"{b+j+1:03} {c['face']}",font=font,fill='#111111')
  for k,line in enumerate(textwrap.wrap(c['effect'],width=42)[:4]):d.text((x+6,y+419+k*15),line,font=small,fill='#222222')
  manifest.append({'number':b+j+1,'face':c['face'],'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'dimensions':list(im.size),'contact_sheet':f'cards-{b//16+1:02}.jpg'})
 sheet.save(out/f'cards-{b//16+1:02}.jpg',quality=88)
 print(f'Prepared sheet {b//16+1}/31',flush=True)
(out/'inventory.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Exact coverage: 496 card faces, 496 unique artworks.')
