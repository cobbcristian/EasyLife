from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

brand = Path(r"c:\Users\13528\Desktop\Easy Life\easy-life\public\brand")
out = Path(r"c:\Users\13528\Desktop\Easy Life\easy-life\google-ads-assets")
desktop = Path(r"c:\Users\13528\Desktop\Easy Life\Google Ads Assets")
out.mkdir(parents=True, exist_ok=True)
desktop.mkdir(parents=True, exist_ok=True)


def fit_cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def fit_contain(im: Image.Image, size: tuple[int, int], bg=(246, 241, 232)) -> Image.Image:
    canvas = Image.new("RGB", size, bg)
    tw, th = size
    scale = min(tw / im.width, th / im.height) * 0.7
    nw = max(1, int(im.width * scale))
    nh = max(1, int(im.height * scale))
    im = im.convert("RGBA").resize((nw, nh), Image.Resampling.LANCZOS)
    x = (tw - nw) // 2
    y = (th - nh) // 2
    canvas.paste(im, (x, y), im)
    return canvas


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    names = (
        ["arialbd.ttf", "C:\\Windows\\Fonts\\arialbd.ttf"]
        if bold
        else ["arial.ttf", "C:\\Windows\\Fonts\\arial.ttf"]
    )
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def gradient_overlay(size: tuple[int, int], top_a=30, bottom_a=200) -> Image.Image:
    w, h = size
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for i in range(h):
        a = int(top_a + (bottom_a - top_a) * i / max(1, h - 1))
        draw.line([(0, i), (w, i)], fill=(11, 31, 28, min(220, a)))
    return overlay


# Sources (match files under public/brand)
logo = Image.open(brand / "logo-icon.png").convert("RGBA")
candidates_h = [
    "gallery-clubhouse-terrace.png",
    "onboarding-hero.png",
    "amenity-clubhouse.png",
    "login-hero-easylife.png",
]
candidates_s = [
    "amenity-clubhouse.png",
    "onboarding-hero.png",
    "gallery-clubhouse-terrace.png",
    "login-hero-easylife.png",
]
for name in sorted(set(candidates_h + candidates_s)):
    print(name, "exists" if (brand / name).exists() else "MISSING")

horiz_src = next((brand / n for n in candidates_h if (brand / n).exists()), None)
sq_src = next((brand / n for n in candidates_s if (brand / n).exists()), None)
if horiz_src is None or sq_src is None:
    raise SystemExit("Missing source images in public/brand")
print("horiz:", horiz_src.name)
print("square:", sq_src.name)

# 1) Logo
logo_sq = fit_contain(logo, (1200, 1200), bg=(246, 241, 232))
logo_sq.save(out / "01-logo-square-1200.png", "PNG", optimize=True)
logo_sq.save(desktop / "01-logo-square-1200.png", "PNG", optimize=True)

# 2) Horizontal
horiz = fit_cover(Image.open(horiz_src).convert("RGB"), (1200, 628)).convert("RGBA")
horiz = Image.alpha_composite(horiz, gradient_overlay((1200, 628), 20, 195))
d = ImageDraw.Draw(horiz)
d.text((56, 350), "Easy Life", font=load_font(64, True), fill=(246, 241, 232, 255))
d.text(
    (56, 430),
    "The branded app for HOAs & clubs",
    font=load_font(28),
    fill=(246, 241, 232, 235),
)
d.text(
    (56, 480),
    "Book  ·  Pay  ·  Packages  ·  Desk",
    font=load_font(26, True),
    fill=(200, 90, 55, 255),
)
horiz.convert("RGB").save(out / "02-image-horizontal-1200x628.png", "PNG", optimize=True)
horiz.convert("RGB").save(
    desktop / "02-image-horizontal-1200x628.png", "PNG", optimize=True
)

# 3) Square marketing image
sq = fit_cover(Image.open(sq_src).convert("RGB"), (1200, 1200)).convert("RGBA")
sq = Image.alpha_composite(sq, gradient_overlay((1200, 1200), 15, 200))
logo_badge = logo.copy()
logo_badge.thumbnail((150, 150), Image.Resampling.LANCZOS)
sq.paste(logo_badge, (56, 56), logo_badge)
d2 = ImageDraw.Draw(sq)
d2.text((56, 860), "Request a demo", font=load_font(68, True), fill=(246, 241, 232, 255))
d2.text(
    (56, 960),
    "One app for your building",
    font=load_font(32),
    fill=(246, 241, 232, 230),
)
sq.convert("RGB").save(out / "03-image-square-1200.png", "PNG", optimize=True)
sq.convert("RGB").save(desktop / "03-image-square-1200.png", "PNG", optimize=True)

print("DONE")
for folder in (out, desktop):
    print(folder)
    for p in sorted(folder.glob("*.png")):
        im = Image.open(p)
        print(" ", p.name, im.size, f"{p.stat().st_size // 1024}KB")
