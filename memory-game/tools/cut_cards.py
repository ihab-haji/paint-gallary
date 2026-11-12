"""Cut the Memory Match picture cards out of the picture sheets.

Sheets go in ./src (farm.png, heroes.png, dinos.png, mario.png); boxes below are pixel boxes on those sheets.
Sticker sheets: the light background is removed, then a uniform white die-cut rim and a soft shadow are baked in.
The farm sheet: square paintings, bottom-aligned in each cell.
Usage:  python cut_cards.py ../cards     Needs: pip install pillow numpy scipy
"""
import os, sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
OUT = sys.argv[1]; SIZE = 360
def bg_mask(a, kind):
    r,g,b = [a[...,i].astype(int) for i in range(3)]
    mx = np.maximum(np.maximum(r,g),b); mn = np.minimum(np.minimum(r,g),b)
    return (mn > 150) & (mx - mn < 22)   # light neutral: sheet, white sticker rims, grey sheet
def sticker(sheet, box, name, keep=0.10, clip=None, outline=False):
    im = Image.open(f'src/{sheet}.png').convert('RGB').crop(box)
    a = np.asarray(im)
    bgl = bg_mask(a, sheet)
    if clip is not None:  # extra polygon-free rect cuts (in sheet coords) treated as background
        for (x0,y0,x1,y1) in clip:
            bgl[max(0,y0-box[1]):max(0,y1-box[1]), max(0,x0-box[0]):max(0,x1-box[0])] = True
    # background = light pixels connected to the crop edge
    lab, n = nd.label(bgl)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
    bg = np.isin(lab, list(edge))
    fg = ~bg
    if outline:  # a shape closed by a dark outline: fill the loop that holds the centre
        dark = a.max(axis=2) < 90
        filled = nd.binary_fill_holes(dark)
        lab2, _ = nd.label(filled)
        egg = nd.binary_opening(lab2 == lab2[a.shape[0]//2, a.shape[1]//2], iterations=9)
        l3, _ = nd.label(egg); egg = l3 == l3[a.shape[0]//2, a.shape[1]//2]
        fg = nd.binary_dilation(egg, iterations=1)
    fg = nd.binary_opening(fg, iterations=1)
    lab, n = nd.label(fg)
    sizes = nd.sum(fg, lab, range(1, n+1))
    big = sizes.max()
    fg = np.isin(lab, [i+1 for i,s in enumerate(sizes) if s >= big*keep])
    holes = nd.binary_fill_holes(fg) & ~fg
    hl, hn = nd.label(holes)
    if hn:
        hs = nd.sum(holes, hl, range(1, hn+1))
        fg |= np.isin(hl, [i+1 for i,s in enumerate(hs) if s < 900])
    ys, xs = np.where(fg); y0,y1,x0,x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
    art = np.dstack([a, (fg*255).astype(np.uint8)])[y0:y1, x0:x1]
    h, w = art.shape[:2]
    # fit into the canvas leaving room for the rim + shadow
    inner = int(SIZE*0.80); s = inner / max(w, h)
    art_im = Image.fromarray(art, 'RGBA').resize((max(1,round(w*s)), max(1,round(h*s))), Image.LANCZOS)
    canvas_a = Image.new('L', (SIZE, SIZE), 0)
    ox, oy = (SIZE-art_im.width)//2, (SIZE-art_im.height)//2 - 4
    canvas_a.paste(art_im.split()[3], (ox, oy))
    m = np.asarray(canvas_a) > 110
    rim = nd.binary_dilation(m, structure=np.ones((3,3)), iterations=9)
    rim = np.asarray(Image.fromarray((rim*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))) > 120  # rounded die-cut
    rim_a = Image.fromarray((rim*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    shadow = Image.new('RGBA', (SIZE, SIZE), (40, 24, 60, 0))
    sh_a = rim_a.point(lambda v: int(v*0.30)).filter(ImageFilter.GaussianBlur(7))
    shadow.putalpha(Image.new('L',(SIZE,SIZE),0)); shadow.putalpha(ImageChops_offset(sh_a, 0, 7))
    white = Image.new('RGBA', (SIZE, SIZE), (255,255,255,0)); white.putalpha(rim_a)
    out = Image.alpha_composite(shadow, white)
    layer = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0)); layer.paste(art_im, (ox, oy), art_im)
    out = Image.alpha_composite(out, layer)
    save(out, sheet, name)
def ImageChops_offset(im, dx, dy):
    o = Image.new('L', im.size, 0); o.paste(im, (dx, dy)); return o
def photo(sheet, box, name, corner_fill=False):
    im = Image.open(f'src/{sheet}.png').convert('RGB').crop(box)
    a = np.asarray(im).copy()
    if corner_fill:  # rounded phone-frame corners: paint the dark pixels with the cell colour
        dark = a.max(axis=2) < 70
        lab, n = nd.label(dark)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
        mask = np.isin(lab, list(edge))
        ref = a[~mask].reshape(-1,3)
        # sample colour from the top row centre
        col = np.median(a[2:12, a.shape[1]//2-20:a.shape[1]//2+20].reshape(-1,3), axis=0)
        a[mask] = col
    im = Image.fromarray(a).resize((SIZE, SIZE), Image.LANCZOS)
    save(im, sheet, name)
def save(im, sheet, name):
    d = os.path.join(OUT, sheet); os.makedirs(d, exist_ok=True)
    im.save(os.path.join(d, name + '.webp'), 'WEBP', quality=84, method=6)
    im.save(os.path.join('preview', sheet + '-' + name + '.png'))
os.makedirs('preview', exist_ok=True)
# ---------- farm: square paintings, bottom-aligned in each cell ----------
COLS = [(58, 396), (404, 748), (756, 1098)]
ROWS = [(0, 366), (372, 746), (752, 1120), (1126, 1492), (1498, 1866)]
def cell(c, r, top=None):
    x0, x1 = COLS[c]; y0, y1 = ROWS[r]; s = x1 - x0
    return (x0, y1 - s - 2, x1, y1 - 2)
for name, c, r in [('cat',0,0),('bunny',1,0),('hen',2,0),('horse',0,1),('pony',1,1),('cow',2,1),('frog',0,2),('bird',1,2),
                   ('pigeon',1,3),('sheep',2,3),('lamb',0,4),('donkey',1,4)]:
    photo('farm', cell(c, r), name, corner_fill=(r in (0, 4)))
# ---------- heroes ----------
for name, box in [('superman',(100,0,355,295)),('captain',(370,0,600,290)),('spiderman',(600,0,830,295)),
                  ('hulk',(105,305,345,580)),('flash',(365,315,595,585)),('batman',(345,1175,635,1475))]:
    sticker('heroes', box, name)
# ---------- dinos ----------
for name, box in [('rex',(880,360,1135,695)),('tri',(465,405,735,680)),('longneck',(655,40,940,360)),('stego',(910,50,1222,345)),
                  ('ptero',(80,385,520,600)),('baby',(420,720,625,1005)),('sea',(865,1030,1185,1315)),('para',(85,1320,375,1600)),
                  ('volcano',(640,1035,845,1290)),('sleepy',(1200,1035,1535,1295)),('heart',(695,1570,895,1845)),('flower',(372,1575,655,1845))]:
    sticker('dinos', box, name)
# ---------- mario ----------
for name, box, clip in [('mario',(8,8,198,258),None),('luigi',(198,8,392,252),None),('piranha',(390,8,642,288),None),
                  ('kart',(652,2,1008,302),None),('mushroom',(276,310,550,575),None),('pipe',(548,305,770,678),[(548,305,770,312)]),
                  ('tanooki',(200,760,438,1045),[(200,760,262,940)]),('star',(428,866,608,1042),[(556,860,640,918)]),('peach',(752,602,1012,1055),None),
                  ('tophat',(230,1040,480,1380),None),('egg',(646,990,816,1170),'outline'),('yoshi',(766,1105,1002,1425),None),('flower',(2,1236,194,1434),None)]:
    sticker('mario', box, name, clip=None if clip=='outline' else clip, outline=clip=='outline')
print('done')
