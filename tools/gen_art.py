"""Generate original pixel art with Replicate (Retro Diffusion) from TEXT PROMPTS ONLY.

No Asset Store files are ever uploaded. API keys are read from E:/Game Dev Tools.txt at runtime and never
written into the project.

Usage: python tools/gen_art.py <jobs.json> [--workers 6]
Job: {"out": "src/assets/gen/portraits/maren.png", "prompt": "...", "model": "rd-plus", "style": "default",
      "w": 96, "h": 96, "remove_bg": false, "seed": 1}
Existing outputs are skipped, so the script is resumable.
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


TOKEN = load_key("replicate")
HEAD = {"Authorization": f"Bearer {TOKEN}", "Prefer": "wait=60"}


def run(job: dict) -> str:
    out = ROOT / job["out"]
    if out.exists():
        return f"skip {out.name}"
    out.parent.mkdir(parents=True, exist_ok=True)
    model = job.get("model", "rd-plus")
    payload = {
        "prompt": job["prompt"],
        "style": job.get("style", "default"),
        "width": job.get("w", 64),
        "height": job.get("h", 64),
        "remove_bg": job.get("remove_bg", False),
        "num_images": 1,
    }
    if "seed" in job:
        payload["seed"] = job["seed"]
    last: object = "rate limited"
    for attempt in range(40):
        try:
            r = requests.post(f"https://api.replicate.com/v1/models/retro-diffusion/{model}/predictions",
                              headers=HEAD, json={"input": payload}, timeout=120)
            if r.status_code == 429:
                wait = float(r.json().get("retry_after", 10)) if r.headers.get("content-type", "").startswith("application/json") else 10
                time.sleep(wait + 2)
                continue
            if r.status_code == 402:
                return f"FAIL {out.name}: out of credit"
            r.raise_for_status()
            pred = r.json()
            while pred.get("status") in ("starting", "processing"):
                time.sleep(2)
                pred = requests.get(pred["urls"]["get"], headers={"Authorization": HEAD["Authorization"]}, timeout=60).json()
            if pred.get("status") != "succeeded":
                raise RuntimeError(pred.get("error") or pred.get("status"))
            url = pred["output"][0] if isinstance(pred["output"], list) else pred["output"]
            out.write_bytes(requests.get(url, timeout=120).content)
            return f"ok {out.name}"
        except Exception as err:  # noqa: BLE001 - retry any transient failure, report the last one
            last = err
            time.sleep(4 + attempt * 4)
    return f"FAIL {out.name}: {last}"


def main() -> None:
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    workers = int(sys.argv[sys.argv.index("--workers") + 1]) if "--workers" in sys.argv else 6
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for res in ex.map(run, jobs):
            print(res, flush=True)


if __name__ == "__main__":
    main()
