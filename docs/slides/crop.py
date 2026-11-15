# Crop app screenshots (captured at 2x of a 1440x900 viewport) for the slides.
import os, sys
from PIL import Image

d = sys.argv[1]
os.makedirs(os.path.join(d, 'crops'), exist_ok=True)
# name: (source, x0, y0, x1, y1) in CSS pixels
crops = {
    'hero': ('home', 150, 255, 860, 840),
    'bodymap': ('home', 150, 255, 1290, 810),
    'profile': ('profile-full', 150, 440, 1290, 995),
    'immune': ('immune', 200, 250, 1240, 840),
    'urgent': ('urgent', 200, 345, 1240, 900),
    'sleep': ('sleep-replay', 150, 140, 790, 900),
}
for name, (src, x0, y0, x1, y1) in crops.items():
    im = Image.open(os.path.join(d, 'shots', src + '.png'))
    out = im.crop((x0 * 2, y0 * 2, x1 * 2, y1 * 2))
    out.save(os.path.join(d, 'crops', name + '.png'), optimize=True)
    print(name, out.size, round(out.size[0] / out.size[1], 3))
