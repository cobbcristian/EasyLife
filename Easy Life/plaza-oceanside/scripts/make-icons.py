"""Regenerate crisp Oceanside app icons — logo fills more of the canvas (less tiny-padding)."""
from PIL import Image
from pathlib import Path

assets = Path(r"C:\Users\13528\Desktop\Easy Life\plaza-oceanside\assets")
word_src = Path(
    r"C:\Users\13528\Desktop\Easy Life\easy-life\public\brand\community-oceanside.png"
)
# Prefer the full branded store mark if present (O swoosh + wordmark).
full_mark = assets / "store-icon-1024.png"
bg = (0, 40, 86)  # Oceanside navy


def scale_cover(src: Image.Image, size: int, fill: float) -> Image.Image:
    """Center-crop/scale so the mark fills `fill` of the square (0–1)."""
    canvas = Image.new("RGBA", (size, size), (*bg, 255))
    mark = src.convert("RGBA")
    # Trim near-empty margins so we can enlarge the real art.
    bbox = mark.getbbox()
    if bbox:
        mark = mark.crop(bbox)
    max_side = int(size * fill)
    mark.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - mark.width) // 2
    y = (size - mark.height) // 2
    canvas.alpha_composite(mark, (x, y))
    return canvas


# Source: wordmark PNG is crisp; if we already have a composed icon, enlarge from brand file.
src = Image.open(word_src)

# App / store icon — fill ~88% so launcher icons aren’t postage-stamp small.
icon = scale_cover(src, 1024, 0.88).convert("RGB")
icon.save(assets / "icon.png", "PNG", optimize=True)
icon.save(assets / "adaptive-icon.png", "PNG", optimize=True)
icon.save(assets / "store-icon-1024.png", "PNG", optimize=True)

# Android adaptive foreground: transparent, mark sized for the ~66% safe zone
# but drawn larger (~80%) so cropped launchers still look bold.
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
mark = Image.open(word_src).convert("RGBA")
bbox = mark.getbbox()
if bbox:
    mark = mark.crop(bbox)
mark.thumbnail((860, 860), Image.Resampling.LANCZOS)
fx = (1024 - mark.width) // 2
fy = (1024 - mark.height) // 2
fg.alpha_composite(mark, (fx, fy))
fg.save(assets / "android-icon-foreground.png", "PNG")
Image.new("RGB", (1024, 1024), bg).save(assets / "android-icon-background.png", "PNG")

# Monochrome: white mark for themed icons
mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
m = mark.convert("RGBA")
# Force opaque pixels toward white
pixels = m.load()
for y in range(m.height):
    for x in range(m.width):
        r, g, b, a = pixels[x, y]
        if a > 20:
            pixels[x, y] = (255, 255, 255, a)
mx = (1024 - m.width) // 2
my = (1024 - m.height) // 2
mono.alpha_composite(m, (mx, my))
mono.save(assets / "android-icon-monochrome.png", "PNG")

# Splash
splash = Image.new("RGB", (1284, 2778), bg)
wm2 = Image.open(word_src).convert("RGBA")
bb = wm2.getbbox()
if bb:
    wm2 = wm2.crop(bb)
wm2.thumbnail((980, 980), Image.Resampling.LANCZOS)
sx = (1284 - wm2.width) // 2
sy = (2778 - wm2.height) // 2
sp = splash.convert("RGBA")
sp.alpha_composite(wm2, (sx, sy))
sp.convert("RGB").save(assets / "splash-icon.png", "PNG")

print("ok", (assets / "icon.png").stat().st_size, Image.open(assets / "icon.png").size)
