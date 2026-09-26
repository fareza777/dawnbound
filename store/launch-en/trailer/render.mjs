import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill, renderMedia } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable =
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const comps = await getCompositions(serveUrl, { browserExecutable });
fs.mkdirSync("../exports", { recursive: true });
for (const c of comps.filter((c) => c.durationInFrames === 1)) {
  await renderStill({
    serveUrl,
    composition: c,
    output: `../exports/${c.id}.png`,
    imageFormat: "png",
    browserExecutable,
  });
  console.log("Exported", c.id);
}
if (!process.argv.includes("--stills"))
  for (const c of comps.filter((c) => c.durationInFrames > 1)) {
    let last = -1;
    await renderMedia({
      serveUrl,
      composition: c,
      outputLocation: `../exports/${c.id}.mp4`,
      codec: "h264",
      crf: 18,
      pixelFormat: "yuv420p",
      browserExecutable,
      concurrency: 3,
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 10);
        if (p !== last) {
          last = p;
          console.log(c.id, p * 10 + "%");
        }
      },
    });
    console.log("Exported", c.id);
  }
