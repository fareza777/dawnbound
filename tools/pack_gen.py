"""Pack generated art and audio for fast mobile loading.

- icons + ui icons  -> public/assets/gen/icons.png/.json   (frame names = texture keys used in code)
- portraits         -> public/assets/gen/portraits.png/.json
- key art           -> copied as-is (loaded individually, only 13 files)
- sfx + voice       -> public/assets/audio/sfx.mp3 + sfx.json (Phaser audio sprite)
- music             -> public/assets/audio/music/*.mp3 re-encoded at 112 kbps
"""
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GEN = ROOT / "src" / "assets" / "gen"
AUD = ROOT / "src" / "assets" / "audio"
OUT = ROOT / "public" / "assets" / "gen"
AOUT = ROOT / "public" / "assets" / "audio"
FF = imageio_ffmpeg.get_ffmpeg_exe()


def pack(name: str, files: list[tuple[str, Path]], cell: int, cols: int) -> None:
    rows = (len(files) + cols - 1) // cols
    h = 1
    while h < rows * (cell + 2):
        h *= 2
    sheet = Image.new("RGBA", (cols * (cell + 2), h), (0, 0, 0, 0))
    frames = {}
    for i, (key, path) in enumerate(files):
        im = Image.open(path).convert("RGBA")
        if im.size != (cell, cell):
            im = im.resize((cell, cell), Image.NEAREST)
        x = (i % cols) * (cell + 2) + 1
        y = (i // cols) * (cell + 2) + 1
        sheet.paste(im, (x, y))
        frames[key] = {"frame": {"x": x, "y": y, "w": cell, "h": cell}, "rotated": False, "trimmed": False,
                       "spriteSourceSize": {"x": 0, "y": 0, "w": cell, "h": cell}, "sourceSize": {"w": cell, "h": cell}}
    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / f"{name}.png", optimize=True)
    meta = {"image": f"{name}.png", "size": {"w": sheet.width, "h": sheet.height}, "scale": "1"}
    (OUT / f"{name}.json").write_text(json.dumps({"frames": frames, "meta": meta}), encoding="utf-8")
    print(f"{name}: {len(files)} frames, {sheet.width}x{sheet.height}")


def images() -> None:
    icons = [(f"icons_{p.stem}", p) for p in sorted((GEN / "icons").glob("*.png"))]
    icons += [(f"ui_{p.stem}", p) for p in sorted((GEN / "ui").glob("*.png"))]
    pack("icons", icons, 32, 32)
    portraits = [(f"portraits_{p.stem}", p) for p in sorted((GEN / "portraits").glob("*.png"))]
    pack("portraits", portraits, 96, 10)
    (OUT / "art").mkdir(parents=True, exist_ok=True)
    for p in sorted((GEN / "art").glob("*.png")):
        Image.open(p).save(OUT / "art" / p.name, optimize=True)


def audio() -> None:
    AOUT.mkdir(parents=True, exist_ok=True)
    (AOUT / "music").mkdir(exist_ok=True)
    for p in sorted((AUD / "music").glob("*.mp3")):
        dst = AOUT / "music" / p.name
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(p), "-b:a", "112k", "-ar", "44100", str(dst)], check=True)
    clips = sorted((AUD / "sfx").glob("*.mp3")) + sorted((AUD / "voice").glob("*.mp3"))
    # Decode every clip to raw PCM, concatenate with short silences, encode once.
    rate = 44100
    gap = int(rate * 0.25)
    pcm = bytearray()
    spritemap = {}
    for p in clips:
        raw = subprocess.run([FF, "-loglevel", "error", "-i", str(p), "-f", "s16le", "-ac", "1", "-ar", str(rate), "-"],
                             check=True, capture_output=True).stdout
        start = len(pcm) / 2 / rate
        pcm += raw
        end = len(pcm) / 2 / rate
        spritemap[p.stem] = {"start": round(start, 4), "end": round(end, 4), "loop": False}
        pcm += b"\x00\x00" * gap
    tmp = AOUT / "_sfx.raw"
    tmp.write_bytes(bytes(pcm))
    subprocess.run([FF, "-y", "-loglevel", "error", "-f", "s16le", "-ac", "1", "-ar", str(rate), "-i", str(tmp),
                    "-b:a", "96k", str(AOUT / "sfx.mp3")], check=True)
    tmp.unlink()
    (AOUT / "sfx.json").write_text(json.dumps({"resources": ["sfx.mp3"], "spritemap": spritemap}), encoding="utf-8")
    print(f"audio sprite: {len(clips)} clips, {len(pcm) / 2 / rate:.1f}s")


if __name__ == "__main__":
    images()
    audio()
