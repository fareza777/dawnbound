# Dawnbound — English launch campaign

All campaign copy is in English. Creative direction: a single amber flame against an indigo and violet world. Hook: **FALL. RISE. RETURN STRONGER.**

## Deliverables

- `exports/App-Icon.png`: 512 × 512, full square app-store icon.
- `exports/Feature-Graphic.png`: 1024 × 500 Google Play feature graphic.
- `exports/Store-1.png` through `Store-8.png`: eight 1080 × 1920 phone screenshot creatives, in recommended display order.
- `exports/Dawnbound-Landscape.mp4`: 1920 × 1080, 30 fps, 28 seconds, H.264 video with game music.
- `exports/Dawnbound-Vertical.mp4`: 1080 × 1920, 30 fps, 28 seconds, H.264 video with game music.
- `play-listing.md`: English Google Play title, descriptions, privacy URL, and declaration reference.
- Public privacy policy: https://fareza777.github.io/dawnbound/privacy-policy.html.
- `gallery.html`: local visual review gallery.
- `trailer/`: editable Remotion project and local source media.
- `source/image-prompts.json`: original built-in image-generation prompts.

## Creative sequence

1. Fall. Rise. Return stronger. — the roguelite loop.
2. One thumb. All action. — combat, dash and Flare.
3. Your build. Your rules. — spirit boon choices.
4. Face the depths. — boss encounter.
5. Every path is a gamble. — branching routes.
6. Four heroes. Find yours. — character selection.
7. Chase the perfect drop. — equipment and loot.
8. Keep the flame alive. — village and narrative.

## Provenance and review

Repository: https://github.com/fareza777/dawnbound. This release update publishes the English listing copy and privacy policy and applies the campaign icon to Android launcher resources.

Claims were checked against `store/listing.md`, `docs/GDD.md`, and hero definitions. Six existing store screenshots are used in the campaign; hero selection and combat were captured from the local QA build. Gameplay capture uses a prepared level-7 loadout and reports no JavaScript errors. Key art and the icon were generated with the built-in image tool. Promotional key art is illustration; screenshots and video gameplay are actual game output. Music is the repository's `m_boss.mp3`.

The store creatives use gameplay captures from the local game build; illustrated feature art is promotional key art. The Android package uses the same lantern mark as the store icon.

## Editing and re-rendering

From `trailer`, run `npm install`, then `npm run dev` to edit. Run `node render.mjs` to export all assets, or `node render.mjs --stills` for the images only. The render script uses the installed Windows Edge executable. Set its path if rendering on another computer.

Google Play preview video uses the landscape MP4 and its YouTube URL in Play Console. Requirements reference: https://support.google.com/googleplay/android-developer/answer/9866151?hl=en. Rendering reference: https://www.remotion.dev/docs/renderer/render-media.

