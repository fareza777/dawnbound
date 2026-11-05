"""Inspect the actual signed Android archives, not just the source build settings."""
import json
import re
import sys
from pathlib import Path
from zipfile import ZipFile

if len(sys.argv) < 3 or sys.argv[1] not in ("closed", "live"):
    raise SystemExit("Usage: python tools/verify_ad_release.py closed|live APK_OR_AAB [...]")
profile = sys.argv[1]
expected_demo = profile == "closed"
root = Path(__file__).resolve().parent.parent
settings = dict(line.split("=", 1) for line in (root / (".env.production" if expected_demo else ".env.live")).read_text().splitlines() if line and not line.startswith("#"))
expected_version = (settings["VITE_APP_VERSION"], int(settings["VITE_VERSION_CODE"]))

for filename in sys.argv[2:]:
    path = Path(filename)
    with ZipFile(path) as archive:
        prefix = "base/assets/" if path.suffix == ".aab" else "assets/"
        mode = json.loads(archive.read(prefix + "public/ad-build.json"))
        assert mode["qa"] is False, "Customer archive contains QA hooks"
        assert mode["testAds"] is expected_demo, "Wrong ad profile"
        assert (mode["versionName"], mode["versionCode"]) == expected_version, "Wrong version"
        config = json.loads(archive.read(prefix + "capacitor.config.json"))
        assert config["appId"] == "com.fajar.dawnbound"
        assert config["appName"] == "Dawnbound: Roguelike RPG"
        assert config["plugins"]["SystemBars"] == {
            "insetsHandling": "native", "initialViewportFitValueHint": "contain"
        }
        html = archive.read(prefix + "public/index.html").decode()
        assert "viewport-fit=contain" in html
        scripts = [name for name in archive.namelist() if name.startswith(prefix + "public/assets/") and name.endswith(".js")]
        assert not any("/dev-" in name for name in scripts), "Development chunk included"
        bundled = "\n".join(archive.read(name).decode() for name in scripts)
        for forbidden in ("__services", "__nativeAdResult", "Test Ads", "Google test ads"):
            assert forbidden not in bundled, f"Customer bundle contains {forbidden}"
        selectors = re.findall(r"\buseTestAds:\s*(![01]|true|false)", bundled)
        assert selectors == (["!0"] if expected_demo else ["!1"]), f"Wrong compiled ad selector: {selectors}"
        assert all(unit in bundled for unit in (
            "ca-app-pub-6279186647593327/1259905416",
            "ca-app-pub-6279186647593327/7604898479",
            "ca-app-pub-6279186647593327/3665653467",
        )), "Registered publisher unit missing"
        resources = "base/resources.pb" if path.suffix == ".aab" else "resources.arsc"
        assert b"ca-app-pub-6279186647593327~3638656746" in archive.read(resources), "Wrong native publisher App ID"
        if path.suffix == ".aab":
            assert any(name.startswith("META-INF/") and name.endswith(".RSA") for name in archive.namelist()), "Unsigned bundle"
    print(json.dumps({"file": path.name, "bytes": path.stat().st_size, "profile": profile, **mode, "checks": "PASS"}))
