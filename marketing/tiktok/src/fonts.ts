import { continueRender, delayRender, staticFile } from 'remotion';

const FILES: [string, string][] = [
  ['DawnDisplay', 'fonts/Jersey20-Regular.ttf'],
  ['DawnTerminal', 'fonts/VT323-Regular.ttf'],
  ['DawnLabel', 'fonts/Silkscreen-Bold.ttf'],
];

const handle = delayRender('fonts');

/** Resolves once every display face is in document.fonts, so canvas text measurement is truthful. */
export const fontsReady = Promise.all(
  FILES.map(async ([family, file]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`);
    document.fonts.add(face);
    await face.load();
  }),
).then(() => continueRender(handle));
