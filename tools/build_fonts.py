"""Bake OFL pixel TTF fonts into crisp BMFont (XML .fnt + .png) atlases for Phaser BitmapText.

Each font is baked at 1x (Low quality: the canvas is one pixel per virtual pixel) and at 2x/3x/4x for High quality,
where the canvas renders several device pixels per virtual pixel. The hi-res atlases draw every glyph exactly on
device pixels, so text keeps the pixel style but with the font's true, crisp shapes. The runtime picks the atlas
matching the render scale and draws it at the logical size. "Outline" variants add a 1-virtual-pixel dark outline.
Glyphs are white so they can be tinted at runtime.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "public" / "assets" / "fonts"
CHARS = [chr(c) for c in range(32, 127)] + list("…•·×°—’“”éèàáíóúñçüöä↑↓←→")

FONTS = [
    # key, ttf, size at 1x, logical size on hi-res, outline, weight (variable fonts), ttf at 1x (if different)
    # Jersey is bold and unambiguous on phones (Pixelify drew "5" like "S" and "B" like "G").
    ("body", "Jersey15-Regular.ttf", 15, 16, True, None, None),
    ("bodyplain", "Jersey15-Regular.ttf", 15, 16, False, None, None),
    ("head", "Jersey20-Regular.ttf", 20, 18, True, None, None),
    ("title", "Jersey20-Regular.ttf", 20, 22, True, None, None),
    # Small text: Jersey's tall x-height reads far better than Tiny5 on phones; Tiny5 stays for 1x (Low quality),
    # where Jersey would be drawn off its native pixel grid.
    ("small", "Jersey15-Regular.ttf", 8, 12, True, None, "Tiny5-Regular.ttf"),
    ("smallplain", "Jersey15-Regular.ttf", 8, 12, False, None, "Tiny5-Regular.ttf"),
]
SCALES = [1, 2, 3, 4]
FALLBACK = "Tiny5-Regular.ttf"


def render_glyph(font, ch, line_h, outline, scale):
    left, _top, right, _bottom = font.getbbox(ch)
    adv = int(round(font.getlength(ch)))
    w = max(1, right - left)
    pad = scale if outline else 0
    mask = Image.new("L", (w + pad * 2, line_h + pad * 2), 0)
    d = ImageDraw.Draw(mask)
    d.fontmode = "1"
    d.text((pad - left, pad), ch, font=font, fill=255)
    mask = mask.point(lambda v: 255 if v > 127 else 0)
    img = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    if outline:
        grown = mask.filter(ImageFilter.MaxFilter(2 * scale + 1))
        img.paste((12, 10, 20, 255), (0, 0), grown)
    img.paste((255, 255, 255, 255), (0, 0), mask)
    return img, left - pad, adv


def build(key, ttf, size1x, size_hi, outline, weight, ttf1x, scale):
    if scale == 1 and ttf1x:
        ttf = ttf1x
    size = (size1x if scale == 1 else size_hi) * scale
    font = ImageFont.truetype(str(ROOT / "fonts" / ttf), size)
    if weight:
        font.set_variation_by_axes([weight])
    name = key if scale == 1 else f"{key}@{scale}x"
    # Glyphs the font lacks (e.g. arrows) come from a fallback font at a matching cap height.
    cmap = TTFont(str(ROOT / "fonts" / ttf)).getBestCmap()
    fallback = ImageFont.truetype(str(ROOT / "fonts" / FALLBACK), max(8, round(size * 0.8)))
    ascent, descent = font.getmetrics()
    line_h = ascent + descent
    glyphs = []
    for ch in CHARS:
        if ch == " ":
            glyphs.append((ch, None, 0, int(round(font.getlength(" ")))))
            continue
        src = font if ord(ch) in cmap else fallback
        img, xoff, adv = render_glyph(src, ch, line_h, outline, scale)
        glyphs.append((ch, img, xoff, adv))

    atlas_w = 512 * min(4, scale)
    x = y = 0
    row_h = 0
    placed = []
    for ch, img, xoff, adv in glyphs:
        if img is None:
            placed.append((ch, 0, 0, 0, 0, 0, adv))
            continue
        if x + img.width + 1 > atlas_w:
            x = 0
            y += row_h + 1
            row_h = 0
        placed.append((ch, x, y, img.width, img.height, xoff, adv))
        row_h = max(row_h, img.height)
        x += img.width + 1
    atlas_h = 1
    while atlas_h < y + row_h + 1:
        atlas_h *= 2
    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    for (ch, img, _xo, _ad), (_c, px, py, *_rest) in zip(glyphs, placed):
        if img is not None:
            atlas.paste(img, (px, py))

    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / f"{name}.png", optimize=True)
    extra = scale if outline else 0
    lines = [
        '<?xml version="1.0"?>',
        "<font>",
        f'  <info face="{key}" size="{size}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="0" padding="0,0,0,0" spacing="1,1"/>',
        f'  <common lineHeight="{line_h + extra * 2}" base="{ascent + extra}" scaleW="{atlas_w}" scaleH="{atlas_h}" pages="1" packed="0"/>',
        "  <pages>",
        f'    <page id="0" file="{name}.png"/>',
        "  </pages>",
        f'  <chars count="{len(placed)}">',
    ]
    for ch, px, py, w, h, xoff, adv in placed:
        lines.append(
            f'    <char id="{ord(ch)}" x="{px}" y="{py}" width="{w}" height="{h}" xoffset="{xoff}" yoffset="0" '
            f'xadvance="{adv + extra}" page="0" chnl="15"/>'
        )
    lines += ["  </chars>", "</font>"]
    (OUT / f"{name}.fnt").write_text("\n".join(lines), encoding="utf-8")
    print(f"{name}: {len(placed)} glyphs, line {line_h}, atlas {atlas_w}x{atlas_h}")


if __name__ == "__main__":
    for spec in FONTS:
        for sc in SCALES:
            build(*spec, sc)
