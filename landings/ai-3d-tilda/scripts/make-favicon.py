# Builds the shared favicon set (landing + site) from the GRIPINSKY "3D" mark.
# Usage: python scripts/make-favicon.py brand/favicon [variant]   variant: dark (default) | acid
#   dark  — acid mark on the near-black tile (like the site and the landing hero)
#   acid  — near-black mark on an acid tile (like the main buttons; pops on dark and light tab bars)
# Needs Pillow; SVG masters are rasterised with Google Chrome (headless), so no extra SVG libraries.
import os, subprocess, sys, tempfile
from PIL import Image, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'brand/favicon'
VARIANT = sys.argv[2] if len(sys.argv) > 2 else 'dark'
ACCENT, INK = '#DEFB32', '#101111'
TILE, MARK = (INK, ACCENT) if VARIANT == 'dark' else (ACCENT, INK)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
HERE = os.path.dirname(os.path.abspath(__file__))
MARK_PATH = open(os.path.join(HERE, 'favicon-mark.path')).read().strip()   # the "3D" mascot, 330x324 units
MW, MH = 330.0, 324.0

def svg(size, scale, radius, tile=True):
    """size: viewBox side; scale: mark width as a share of the side; radius: corner radius as a share."""
    s = size * scale / MW
    x, y = (size - MW * s) / 2, (size - MH * s) / 2
    rect = f'<rect width="{size}" height="{size}" rx="{size * radius:.2f}" fill="{TILE}"/>' if tile else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">{rect}'
            f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.5f})" fill="{MARK}">{MARK_PATH}</g></svg>')

def render(svg_text, px):
    with tempfile.TemporaryDirectory() as d:
        src, png = os.path.join(d, 'i.svg'), os.path.join(d, 'i.png')
        open(src, 'w').write(svg_text)
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
                        f'--window-size={px},{px}', f'--screenshot={png}', f'--user-data-dir={d}/p', 'file://' + src],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return Image.open(png).convert('RGBA').crop((0, 0, px, px))

def small(master, px):
    im = master.resize((px, px), Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(radius=.6, percent=60, threshold=0)) if px <= 32 else im

os.makedirs(OUT, exist_ok=True)
M = 1024
tab = render(svg(M, .90, .2), M)              # browser tab: rounded tile, mark nearly edge to edge (16 px needs every pixel)
full = render(svg(M, .70, 0), M)              # iOS / opaque: the system rounds the corners itself
mask = render(svg(M, .58, 0), M)              # Android maskable: mark inside the 80% safe zone

open(os.path.join(OUT, 'favicon.svg'), 'w').write(svg(64, .90, .2))
small(tab, 48).save(os.path.join(OUT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)], append_images=[small(tab, 16), small(tab, 32)])
small(tab, 32).save(os.path.join(OUT, 'favicon-32.png'))
small(tab, 16).save(os.path.join(OUT, 'favicon-16.png'))
full.resize((180, 180), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
render(svg(M, .80, .22), M).resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
render(svg(M, .80, .22), M).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
mask.resize((512, 512), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'icon-maskable-512.png'))
print('variant', VARIANT, '->', OUT, sorted(os.listdir(OUT)))
