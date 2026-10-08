# THE LAST LIGHT — game design & engineering notes

`/play/game/` · a third-person Mars exploration game inside Echoes Beyond Earth.

> **Independent educational demo.** Pre-event work. It is **not** an approved NASA Space Apps 2026 competition submission, and it is not affiliated with or endorsed by NASA. The landscape, the EKO companion, the explorer and the story are artistic. Every historical statement restates a NASA fact already cited in this repository.

## Play

| Desktop | Touch |
| --- | --- |
| **W A S D / arrows**: move (camera-relative) | Left joystick: move |
| **Mouse drag** (or click to capture the mouse): camera · **wheel**: zoom | Drag the right side: camera |
| **Shift**: sprint · **Space**: jump (Mars gravity, 3.71 m/s²) | Sprint toggle · Jump button |
| **E**: scan / interact · **V**: first-person inspection view | Interact button (or tap the prompt) |
| **Tab**: evidence · **M**: map · **J**: journal | Quick-bar buttons |
| **Enter**: advance dialogue / skip cinematic · **Esc**: pause | Skip button · Menu button |

URL switches: `?force2d` (2D mission console), `?quality=low|medium|high|ultra` (graphics override), `?touch` (show touch controls on any device).

## Campaign

| # | Chapter | Gameplay | NASA records recovered |
| --- | --- | --- | --- |
| 01 | The Awakening | Intro cinematic, movement tutorial, first memory beacon | Final traverse map (PIA23178) |
| 02 | Footprints in the Dust | Follow tracks to NASA's own Opportunity GLB; scan wheels, solar panels and the Pancam mast in any order; component-identification puzzle | Wheels, solar power, Legacy Pan (PIA22909) |
| 03 | The Great Storm | Artistic storm reconstruction (sky, fog, wind and EKO's mood change); recover records; science decision on solar power | 2018 storm, last transmitted image (PIA22929), recovery attempts and end of mission |
| 04 | Echoes of the Past | Fictional holographic archive; restore four memory fragments (real NASA images on the panels); timeline reconstruction; link to the Memory Lens | Legacy Pan release (March 12, 2019) |
| 05 | The Last Light | Return to Oppy, assemble the evidence (four-question challenge), finale cinematic, completion certificate, Passport stamp | — |

Optional side discoveries (from chapter 2): a family of rovers (PIA11436), Perseverance Valley (PIA23178) and sols (PIA22909).

Progression: XP per objective (+25 for puzzles solved first try), six explorer levels, nine achievements, autosave, resume, chapter select and replay. Rewards are **derived** from completed objectives, so replaying can never double-count them, and the level never drops (`bestXp`).

## Architecture

```
src/game/
  content/   world.ts (POIs, artistic layout) · evidence.ts (NASA records) · chapters.ts (5 chapters, objectives,
             side discoveries, achievements, levels) · puzzles.ts (+ pure validators) · cutscenes.ts (shots + subtitles)
  core/      math.ts · terrain.ts (deterministic heightfield, rock field, collision grid) · player.ts (kinematics)
             camera.ts (orbit rig + collision) · companion.ts (EKO AI + emotions) · progress.ts (quest engine, XP,
             achievements, save sanitizing) · session.ts (GameSession: the single source of truth)
  engine/    Engine.ts (Three.js renderer, lazy chunk) · world.ts (sky, terrain, mesas, rocks, dust, tracks)
             actors.ts (generated astronaut GLB + fallback, EKO, NASA rover GLB + Draco) · props.ts (beacons, terminals, archive)
  ui/        GameRoot.tsx · Hud.tsx · Panels.tsx · Puzzles.tsx · Menus.tsx · Console2D.tsx · Modal.tsx · game.css
  input.ts · audio.ts · settings.ts
```

* **One simulation, two renderers.** `GameSession` owns movement, EKO, quests, dialogue, cutscene timing, prompts and autosave. It has no DOM or WebGL dependency. The 3D `Engine` and the 2D `Console2D` both call `session.tick()`, so the 2D alternative is the *same game*, not a quiz page.
* **Why plain Three.js:** it adds GLTF + Draco (the NASA rover), shadows, fog, instancing and particles in one lazily loaded chunk (≈348 KiB raw / 85 KiB gzip, measured). React Three Fiber would add a reconciler on top of an imperative game loop, and Rapier physics is unnecessary: a heightfield plus circle colliders gives deterministic, unit-testable movement.
* **Static export preserved.** No backend or API routes. The Draco decoder is copied from `three` into `public/vendor/draco/` by `scripts/copy-draco-decoder.mjs` (pre-dev/pre-build), so the NASA model decodes same-origin on GitHub Pages.
* **Saves** live in `localStorage` (`the-last-signal:game:last-light`). `sanitizeProgress` rejects unknown ids, drops objectives whose prerequisites are missing, clamps numbers and resets invalid positions, so corrupt or hand-edited saves recover safely.

## Performance & resilience

* Quality presets Low / Medium / High / Ultra plus **Auto** (phones start Low, capable desktops may start Ultra), which steps down when the measured frame rate stays under 42 FPS (desktop) or 26 FPS (touch) for two 2.5-second windows.
* The explorer uses the committed rigged GLB at `/public/models/game/explorer-{ultra,high,low}.glb`. Regenerate it with `npm run assets:build -- explorer`; the generator records triangle counts, animation clips and SHA-256 hashes in the manifest. Terrain and rocks use the generated regolith/rock base-color, normal and ORM maps.
* The FPS, preset and CPU frame time are measured and shown live (Settings → *Show performance*).
* Instanced rocks, a centre-dense terrain grid, a shader-only sky and dust, frame-rate-independent simulation, and rendering paused while the tab is hidden.
* WebGL context loss shows a dialog: *Restart 3D* rebuilds the engine, or *Continue in 2D console*. Progress is already saved. If WebGL is missing or the engine fails to start, the 2D console is used automatically.
* **Measured so far:** only headless Chromium with SwiftShader (software rendering, single-digit FPS). That says nothing about GPU devices. **The 60 FPS desktop / 30 FPS mid-range mobile targets have not been verified on physical hardware.**

## Accessibility

Keyboard-only play; focus-trapped dialogs with Escape and focus return; the 2D console and mission map offer "travel to" lists for screen-reader users; subtitles for every line, with a large size; optional browser speech narration (EN/BN, voice availability varies); reduced motion (static cinematic framing, no bob/shake/FOV kick, minimal animation); separate master/music/effects volumes. Audio is generated with Web Audio and starts only after a click.

## Honesty rules (kept)

* No invented transmissions, quotes, telemetry or "last words". EKO says outright that it will not invent what Oppy said.
* The storm, the archive and the finale are labelled on screen as artistic reconstructions.
* The power puzzle's light gauge is labelled "illustrative teaching model — not real rover data".
* The game map is labelled "not real Martian coordinates".
* The certificate is labelled "Educational reward — not an official NASA certificate" and collects no name.

## Tests

* `npm test`: unit tests for content integrity, puzzles, terrain, player/camera/companion, the quest engine, saves, and full-campaign sessions (including save/resume, wrong answers and chapter replay).
* `node scripts/e2e-game.mjs` (Playwright, against a served `out/`): main menu → new game → skippable cinematic → real WASD walking → reach and scan objectives → evidence card → Tab/M/J/pause → chapter completion + autosave → walk to the rover → out-of-order component scans → puzzle wrong-then-right → reload + Continue → all five chapters → completion screen + Passport stamp → museum navigation → 2D console campaign → mobile joystick + sprint toggle → existing museum routes. Set `GAME_SHOTS=<dir>` for screenshots.

## Known limitations

* Physical-device performance, screen-reader passes and Bangla wording still need human review. The Bangla text was written for this demo and has not been checked by a fluent science educator.
* The astronaut is a generated original character asset, not a motion-captured character. Blender is not required for the checked-in reproducible generator; a Blender `.blend` authoring file is not included in this environment.
* Offline caching of the game route is not added; the existing EKO service worker covers `/play/` assets only on a best-effort basis.
* The rover GLB is placed at an artistic location and scaled to about 1.5 m tall by bounding box. Do not use it to make claims about real dimensions.
