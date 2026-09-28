"""Generate original music (Replicate: elevenlabs/music) and sound effects (ElevenLabs sound-generation API)
from TEXT PROMPTS ONLY. Keys are read from E:/Game Dev Tools.txt at runtime.

Usage:
  python tools/gen_audio.py music <jobs.json>
  python tools/gen_audio.py sfx <jobs.json>
  python tools/gen_audio.py ambience <jobs.json>   (music-free nature loops)
Music job: {"out": "src/assets/audio/music/m_forest.mp3", "prompt": "...", "seconds": 75}
SFX job:   {"out": "src/assets/audio/sfx/hit.mp3", "prompt": "...", "seconds": 0.6, "influence": 0.5}
"""
import json
import sys
import time
import concurrent.futures as cf
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent


def load_key(name: str) -> str:
    for line in Path("E:/Game Dev Tools.txt").read_text(encoding="utf-8").splitlines():
        if ":" in line and line.split(":", 1)[0].strip().lower() == name:
            return line.split(":", 1)[1].strip()
    raise SystemExit(f"missing key {name}")


def music(job: dict) -> str:
    out = ROOT / job["out"]
    if out.exists():
        return f"skip {out.name}"
    out.parent.mkdir(parents=True, exist_ok=True)
    token = load_key("replicate")
    head = {"Authorization": f"Bearer {token}", "Prefer": "wait=60"}
    payload = {"prompt": job["prompt"], "music_length_ms": int(job.get("seconds", 60) * 1000),
               "force_instrumental": True, "output_format": "mp3_high_quality"}
    last = None
    for attempt in range(3):
        try:
            r = requests.post("https://api.replicate.com/v1/models/elevenlabs/music/predictions", headers=head,
                              json={"input": payload}, timeout=180)
            r.raise_for_status()
            pred = r.json()
            while pred.get("status") in ("starting", "processing"):
                time.sleep(3)
                pred = requests.get(pred["urls"]["get"], headers={"Authorization": head["Authorization"]}, timeout=60).json()
            if pred.get("status") != "succeeded":
                raise RuntimeError(pred.get("error") or pred.get("status"))
            url = pred["output"][0] if isinstance(pred["output"], list) else pred["output"]
            out.write_bytes(requests.get(url, timeout=300).content)
            return f"ok {out.name} ({pred.get('metrics', {}).get('predict_time', 0):.0f}s)"
        except Exception as err:  # noqa: BLE001
            last = err
            time.sleep(5 + attempt * 5)
    return f"FAIL {out.name}: {last}"


def sfx(job: dict) -> str:
    out = ROOT / job["out"]
    if out.exists():
        return f"skip {out.name}"
    out.parent.mkdir(parents=True, exist_ok=True)
    key = load_key("eleven labs")
    body = {"text": job["prompt"], "prompt_influence": job.get("influence", 0.45)}
    if job.get("seconds"):
        body["duration_seconds"] = max(0.5, float(job["seconds"]))
    if job.get("loop"):  # seamless ambience loop (v2 sound model)
        body["loop"] = True
        body["model_id"] = "eleven_text_to_sound_v2"
    last = None
    for attempt in range(3):
        try:
            r = requests.post("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
                              headers={"xi-api-key": key}, json=body, timeout=120)
            if r.status_code == 429:
                time.sleep(6)
                continue
            r.raise_for_status()
            out.write_bytes(r.content)
            return f"ok {out.name}"
        except Exception as err:  # noqa: BLE001
            last = err
            time.sleep(3 + attempt * 3)
    return f"FAIL {out.name}: {last}"


AMBIENCE_MODEL = "9aff84a639f96d0f7e6081cdea002d15133d0043727f849c40abdd166b7c75a8"  # stackadoc/stable-audio-open-1.0
NO_MUSIC = "music, melody, musical instruments, piano, guitar, strings, drums, beat, rhythm, synth, pad, choir, singing, vocals"


def loopify(raw: bytes, out: Path, fade_s: float = 4.0) -> None:
    """Make a seamless loop: the last `fade_s` seconds are crossfaded into the start, then encoded as mp3."""
    import numpy as np
    import subprocess
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    pcm = subprocess.run([ff, "-v", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "2", "-ar", "44100", "pipe:1"],
                         input=raw, capture_output=True, check=True).stdout
    a = np.frombuffer(pcm, dtype=np.float32).reshape(-1, 2).copy()
    n = int(fade_s * 44100)
    body, tail = a[:-n], a[-n:]
    ramp = np.linspace(0, 1, n, dtype=np.float32)[:, None]
    body[:n] = body[:n] * np.sqrt(ramp) + tail * np.sqrt(1 - ramp)
    body *= 0.89 / max(1e-6, float(np.abs(body).max()))  # normalise to about -1 dBFS
    subprocess.run([ff, "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", "44100", "-i", "pipe:0", "-b:a", "128k", str(out)],
                   input=body.astype(np.float32).tobytes(), check=True)


def ambience(job: dict) -> str:
    """Nature/ambient loop without music (Replicate: Stable Audio Open, negative prompt bans instruments)."""
    out = ROOT / job["out"]
    if out.exists():
        return f"skip {out.name}"
    out.parent.mkdir(parents=True, exist_ok=True)
    head = {"Authorization": f"Bearer {load_key('replicate')}", "Prefer": "wait=60"}
    payload = {"prompt": job["prompt"], "negative_prompt": NO_MUSIC, "seconds_total": int(job.get("seconds", 45)),
               "steps": 100, "cfg_scale": 7}
    if "seed" in job:
        payload["seed"] = job["seed"]
    last = None
    for attempt in range(3):
        try:
            r = requests.post("https://api.replicate.com/v1/predictions", headers=head,
                              json={"version": AMBIENCE_MODEL, "input": payload}, timeout=180)
            r.raise_for_status()
            pred = r.json()
            while pred.get("status") in ("starting", "processing"):
                time.sleep(3)
                pred = requests.get(pred["urls"]["get"], headers={"Authorization": head["Authorization"]}, timeout=60).json()
            if pred.get("status") != "succeeded":
                raise RuntimeError(pred.get("error") or pred.get("status"))
            url = pred["output"][0] if isinstance(pred["output"], list) else pred["output"]
            loopify(requests.get(url, timeout=300).content, out)
            return f"ok {out.name}"
        except Exception as err:  # noqa: BLE001
            last = err
            time.sleep(5 + attempt * 5)
    return f"FAIL {out.name}: {last}"


def main() -> None:
    kind, path = sys.argv[1], sys.argv[2]
    jobs = json.loads(Path(path).read_text(encoding="utf-8"))
    fn = {"music": music, "ambience": ambience}.get(kind, sfx)
    workers = 4 if kind == "music" else 3
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for res in ex.map(fn, jobs):
            print(res, flush=True)


if __name__ == "__main__":
    main()
