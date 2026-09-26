"""Generate original music (Replicate: elevenlabs/music) and sound effects (ElevenLabs sound-generation API)
from TEXT PROMPTS ONLY. Keys are read from E:/Game Dev Tools.txt at runtime.

Usage:
  python tools/gen_audio.py music <jobs.json>
  python tools/gen_audio.py sfx <jobs.json>
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


def main() -> None:
    kind, path = sys.argv[1], sys.argv[2]
    jobs = json.loads(Path(path).read_text(encoding="utf-8"))
    fn = music if kind == "music" else sfx
    workers = 4 if kind == "music" else 3
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for res in ex.map(fn, jobs):
            print(res, flush=True)


if __name__ == "__main__":
    main()
