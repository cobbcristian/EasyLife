"""Resize store screenshots to App Store Connect iPhone 6.5" sizes."""

from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "store-screenshots"
OUT = SRC / "asc-65"
# iPhone XS Max / 11 Pro Max portrait — accepted for 6.5" Display
TARGET = (1242, 2688)
NAMES = ["01-home.png", "02-calendar.png", "03-messages.png"]


def cover_fit(im: Image.Image, tw: int, th: int) -> Image.Image:
    sw, sh = im.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        path = SRC / name
        im = Image.open(path).convert("RGB")
        print(f"{name}: {im.size}")
        out = cover_fit(im, *TARGET)
        dest = OUT / name
        out.save(dest, "PNG", optimize=True)
        print(f"  -> {dest}: {out.size}")


if __name__ == "__main__":
    main()
