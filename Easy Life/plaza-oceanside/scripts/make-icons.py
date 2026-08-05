"""Regenerate crisp Oceanside app icons from the Plaza wordmark (not the 64px favicon)."""
from PIL import Image, ImageDraw
from pathlib import Path

assets = Path(r"C:\Users\13528\Desktop\Easy Life\plaza-oceanside\assets")
word_src = Path(
    r"C:\Users\13528\Desktop\Easy Life\easy-life\public\brand\community-oceanside.png"
)
bg = (0, 40, 86)  # Oceanside navy


def make_icon(size: int = 1024) -> Image.Image:
    canvas = Image.new("RGB", (size, size), bg)
    wm = Image.open(word_src).convert("RGBA")
    # Keep within Apple safe zone (~80% of canvas)
    max_w = int(size * 0.78)
    max_h = int(size * 0.45)
    wm.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    x = (size - wm.width) // 2
    y = (size - wm.height) // 2
    base = canvas.convert("RGBA")
    base.alpha_composite(wm, (x, y))
    return base.convert("RGB")


icon = make_icon(1024)
icon.save(assets / "icon.png", "PNG", optimize=True)
icon.save(assets / "adaptive-icon.png", "PNG", optimize=True)
icon.save(assets / "store-icon-1024.png", "PNG", optimize=True)

# Android adaptive: wordmark on transparent FG + solid navy BG
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
wm = Image.open(word_src).convert("RGBA")
wm.thumbnail((780, 430), Image.Resampling.LANCZOS)
fx = (1024 - wm.width) // 2
fy = (1024 - wm.height) // 2
fg.alpha_composite(wm, (fx, fy))
fg.save(assets / "android-icon-foreground.png", "PNG")
Image.new("RGB", (1024, 1024), bg).save(assets / "android-icon-background.png", "PNG")

# Splash: navy + wordmark
splash = Image.new("RGB", (1284, 2778), bg)
wm2 = Image.open(word_src).convert("RGBA")
wm2.thumbnail((900, 500), Image.Resampling.LANCZOS)
sx = (1284 - wm2.width) // 2
sy = (2778 - wm2.height) // 2
sp = splash.convert("RGBA")
sp.alpha_composite(wm2, (sx, sy))
sp.convert("RGB").save(assets / "splash-icon.png", "PNG")

print("ok", (assets / "icon.png").stat().st_size, Image.open(assets / "icon.png").size)
