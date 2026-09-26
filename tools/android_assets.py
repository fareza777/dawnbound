"""Generate Android launcher icons (legacy + adaptive), splash images and Play Store graphics from the generated art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"
GEN = ROOT / "src" / "assets" / "gen"
STORE = ROOT / "store"
BG = (11, 10, 20, 255)

icon_src = Image.open(GEN / "brand" / "app_icon.png").convert("RGBA")
fg_src = Image.open(GEN / "brand" / "app_icon_fg.png").convert("RGBA")


def crop_to_content(im: Image.Image, pad: int = 6) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def fit(im: Image.Image, size: int, fill: float) -> Image.Image:
    """Scale (nearest, pixel crisp) to occupy `fill` of a square canvas."""
    im = crop_to_content(im)
    target = int(size * fill)
    k = target / max(im.width, im.height)
    scaled = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.NEAREST)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    return canvas


def glow_bg(size: int) -> Image.Image:
    bg = Image.new("RGBA", (size, size), BG)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    r = int(size * 0.34)
    d.ellipse((size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r), fill=(255, 150, 60, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.09))
    bg.alpha_composite(glow)
    return bg


def legacy_icon(size: int, round_mask: bool) -> Image.Image:
    im = glow_bg(size)
    im.alpha_composite(fit(fg_src, size, 0.78))
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    if round_mask:
        md.ellipse((0, 0, size - 1, size - 1), fill=255)
    else:
        md.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.18), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, k in DENS.items():
    d = RES / f"mipmap-{name}"
    d.mkdir(parents=True, exist_ok=True)
    s = int(48 * k)
    legacy_icon(s, False).save(d / "ic_launcher.png")
    legacy_icon(s, True).save(d / "ic_launcher_round.png")
    fs = int(108 * k)
    # Adaptive foreground: keep art inside the 66dp safe zone.
    fit(fg_src, fs, 0.6).save(d / "ic_launcher_foreground.png")

(RES / "values").mkdir(exist_ok=True)
(RES / "values" / "ic_launcher_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B0A14</color>\n</resources>\n',
    encoding="utf-8")

# Splash (Android 12+ uses the icon; older devices use this full-screen drawable).
for folder in [p for p in RES.iterdir() if p.is_dir() and p.name.startswith("drawable")]:
    splash = folder / "splash.png"
    if splash.exists():
        w, h = Image.open(splash).size
        im = Image.new("RGBA", (w, h), BG)
        icon = fit(fg_src, min(w, h) // 2, 0.9)
        im.alpha_composite(icon, ((w - icon.width) // 2, (h - icon.height) // 2))
        im.convert("RGB").save(splash)
(RES / "drawable").mkdir(exist_ok=True)
fit(fg_src, 432, 0.62).save(RES / "drawable" / "splash_icon.png")

# Play Store assets
STORE.mkdir(exist_ok=True)
legacy_icon(512, False).save(STORE / "icon_512.png")
title = Image.open(GEN / "art" / "title.png").convert("RGBA")
feature = Image.new("RGBA", (1024, 500), BG)
bgk = title.resize((1024, int(1024 * title.height / title.width)), Image.NEAREST)
feature.alpha_composite(bgk, (0, -int(bgk.height * 0.35)))
feature.convert("RGB").save(STORE / "feature_1024x500.png")
print("android icons, splash and store graphics written")
