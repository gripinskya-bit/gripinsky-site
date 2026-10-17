# Prepares the two hero images from the source pair (same framing, 1024x1024):
#   src/assets/hero-art.jpg      the wireframe, recoloured to the site accent (#defb32); shown by default
#   src/assets/hero-render.webp  the render cut out on transparency, greens pulled towards the accent;
#                                revealed in small pixels under the mouse
# Needs numpy + opencv-python-headless + pillow (not project dependencies).
# Usage: python scripts/prepare-hero.py render.webp wireframe.webp
import sys, cv2, numpy as np
from PIL import Image

render = np.array(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
wire = np.array(Image.open(sys.argv[2]).convert('RGB')).astype(np.float32)
H, W = wire.shape[:2]
assert render.shape == wire.shape, 'render and wireframe must have the same size'

# Edge fade: floor reflections reach the image border; the page must show through there (mix-blend: lighten).
yy, xx = np.mgrid[0:H, 0:W]
d = np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy]).astype(np.float32)
t = np.clip((d - 8) / 90, 0, 1)
edge = t * t * (3 - 2 * t)

# Wireframe -> acid: line intensity drives the accent colour, the brightest cores go towards pale lime.
inten = wire.max(2) / 255
inten = np.clip(inten * 1.08, 0, 1) ** 0.95
accent = np.array([222, 251, 50], np.float32)
core = np.array([246, 255, 196], np.float32)
c = np.clip((inten - .72) / .28, 0, 1)[..., None]
acid = (accent * (1 - c) + core * c) * inten[..., None]
acid *= edge[..., None]
Image.fromarray(np.clip(acid, 0, 255).astype(np.uint8)).save('src/assets/hero-art.jpg', quality=84, optimize=True, progressive=True)

# Model silhouette from the wireframe (dense lines -> solid shape), used as alpha for the render.
g = wire.max(2)
m = (cv2.GaussianBlur(g, (0, 0), 2.5) > 28).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
m = np.isin(lab, np.where(st[:, 4] > 1500)[0][1:]).astype(np.uint8)          # drop specks
floor = (yy > H * .9) & (cv2.GaussianBlur(g, (0, 0), 6) < 90)               # reflections on the floor are not the model
m[floor] = 0
alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2) * edge

# Pull the render's greens towards the acid of the wireframe and the site (#defb32, hue ~69deg); beige plates,
# black leather and dark metal (low saturation) stay as they are.
hsv = cv2.cvtColor(np.clip(render, 0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
h, sat, val = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
target = 36.0                                                 # OpenCV hue (0..180) of the accent, slightly warm
green = np.clip(1 - np.abs(h - 62) / 34, 0, 1) * np.clip((sat - .12) / .25, 0, 1)
hsv[..., 0] = h + (target - h) * .8 * green
hsv[..., 1] = np.clip(sat * (1 + .5 * green), 0, 1) * 255
hsv[..., 2] = np.clip(val * (1 + .22 * green), 0, 1) * 255
render = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
rgba = np.dstack([render, np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save('src/assets/hero-render.webp', quality=86, method=6)
print('model pixels', int(m.sum()), 'of', H * W)
