from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

assets = Path(r"C:\Users\13528\Desktop\Easy Life\plaza-oceanside\assets")
assets.mkdir(exist_ok=True)
out = assets / "play-feature-graphic.png"

# Google Play feature graphic: 1024 x 500
w, h = 1024, 500
bg = (0, 40, 86)
img = Image.new("RGB", (w, h), bg)
draw = ImageDraw.Draw(img)

# Accent bar
draw.rectangle((0, h - 8, w, h), fill=(14, 116, 144))

word = assets / "brand-wordmark.png"
if word.exists():
    wm = Image.open(word).convert("RGBA")
    wm.thumbnail((720, 280), Image.Resampling.LANCZOS)
    x = (w - wm.width) // 2
    y = (h - wm.height) // 2 - 20
    base = img.convert("RGBA")
    base.alpha_composite(wm, (x, y))
    img = base.convert("RGB")
    draw = ImageDraw.Draw(img)

draw.text(
    (w // 2, h - 48),
    "Resident app  ·  Pompano Beach",
    fill=(180, 210, 230),
    anchor="mm",
)

img.save(out, "PNG")
print("wrote", out, out.stat().st_size)
