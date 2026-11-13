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
| 03 | The Great Storm | Artistic storm reconstruction (sky, fog, wind and EKO's mood change); recover records; **storm lab**: commit a prediction → drag τ (opacity) and watch the 3D sky darken → compare prediction, SIMULATED e^−τ model and OBSERVED JPL estimates → explain (wrong answers get an evidence-based hint) | 2018 storm, last transmitted image (PIA22929), recovery attempts and end of mission |
| 04 | Echoes of the Past | Fictional holographic archive; restore four memory fragments (real NASA images on the panels); timeline reconstruction; **Moon link**: scan a lunar record, then an evidence-reasoning quiz on Surveyor 3 and Apollo 12 (each correct answer explains what the evidence supports and what it cannot); link to the Memory Lens | Legacy Pan release (March 12, 2019); Surveyor 3 (science.nasa.gov); Apollo 12 retrieval of Surveyor 3 parts (NSSDCA 1967-035A) |
| 05 | The Last Light | Return to Oppy, assemble the evidence (four-question challenge), finale cinematic, completion certificate, Passport stamp | — |

Optional side discoveries (from chapter 2): a family of rovers (PIA11436), Perseverance Valley (PIA23178) and sols (PIA22909).

Progression: XP per objective (+25 for puzzles solved first try), six explorer levels, nine achievements, autosave, resume, chapter select and replay. **Story mode** opens chapters in order (chapter N after chapters 1..N-1); after the campaign is finished every chapter stays open. The campaign is finished, and *Keeper of the Last Light* awarded, only when all five chapters are complete.

**Judge preview** (main menu): start any chapter for a demo. Preview state is built by `previewProgress()`, carries `preview: true`, is never persisted (`GameSession.save()` and `GameRoot` both refuse, and `sanitizeProgress()` rejects it), awards no achievements or levels, ends on a "Preview complete" screen without certificate or Passport stamp, and shows a *Preview · not saved* badge throughout. Rewards are **derived** from completed objectives, so replaying can never double-count them, and the level never drops (`bestXp`).

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

* Quality presets Low / Medium / High / Ultra plus **Auto** (phones start Low, capable desktops may start Ultra). Auto (`adaptQuality` in `settings.ts`) checks each 2.5-second window: two slow windows in a row (< 42 FPS desktop, < 26 FPS touch) first lower the render resolution (×0.85, then ×0.72; no shader recompile), then the tier, **Ultra → High → Medium → Low**. It climbs back only after eight smooth windows (≥ 57 / ≥ 45 FPS), never above the initial guess, and never to a tier it has abandoned twice (hysteresis, no oscillation).
* The simulation keeps real-time pace on slow devices: `GameSession.advance()` splits a slow frame into ≤ 1/15 s substeps (catch-up capped at 0.25 s). Previously one tick clamped to 0.1 s per frame put the whole game into slow motion below 10 FPS; that, plus an iteration-capped test loop, caused the CI stall at `c4-reach`.
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

## NASA data used

| Source | How it is used | Access |
| --- | --- | --- |
| NASA Image and Video Library (images.nasa.gov) | 30+ NASA images shipped with the museum and game; **live archive check** on every evidence card | Shipped copies + live API `images-api.nasa.gov` (no key, CORS `*`) |
| NASA Photojournal / JPL news (science.nasa.gov, jpl.nasa.gov) | Captions and dates behind PIA22909, PIA22929, PIA22930, τ values, mission end | Cited and linked |
| NASA/Ames 3D resources | Original Opportunity (MER-B) GLB in the game | Shipped |
| NASA Trek (trek.nasa.gov) | Moon and Mars map tiles in the museum explorer | Downloaded and re-projected |
| NSSDCA (nssdc.gsfc.nasa.gov), PDS | Spacecraft records, Surveyor 3 / Apollo 12 facts | Cited and linked |

**Live archive check** (`src/lib/nasa-images.ts`, evidence cards): only when the player presses *Check NASA's live archive record*, the game requests the card's exact NASA record and a few related NASA images (filtered to the card's world, Mars or Moon). The player compares NASA's own caption and record date with the card (Investigate step). Requests send no credentials or referrer; responses are validated, stripped of markup and rendered as text; only https nasa.gov URLs are kept; results are cached for the session. Offline or blocked, the card says so and keeps its stored copy. api.nasa.gov's Mars Rover Photos and APOD endpoints returned "No such app" when checked on 2026-11-12 and are not used.

## Echo Chain (central learning mechanic)

Press **C** (or the *Echo Chain* button) for the board (`src/game/content/echoChain.ts`, `src/game/ui/EchoChain.tsx`). Each mission (Opportunity on Mars, Surveyor 3 on the Moon) has four links: **Hardware → Evidence → Discovery → Legacy**. A link lights up only when the evidence it depends on has been recovered. Every link answers *What do we know? How do we know? What remains uncertain?*, and every source carries a classification: *Verified NASA record*, *Supported scientific interpretation*, *Educational simulation*, *Artistic reconstruction* or *Verification pending*.

When all four links of a mission are lit, EKO points to the **Claim Check**: the player classifies statements as *Verified record*, *Interpretation* or *Not supported* (for example, invented "last words" and "Surveyor 3 was still sending pictures" are *Not supported*). Grading is exact and deterministic (`gradeClaims`). A pass is stored in the save (`progress.chains`) only if the chain is really unlocked, so forged saves are rejected, and older saves without the field load cleanly.

## Learner profile (optional)

The first *New Game* shows an optional, skippable setup: language, a display name for the certificate (sanitized, at most 32 characters, stored only on this device), a learning level, 2D console, reduced motion and large subtitles. There is no account, no date of birth, and the judge preview does not need it.

| Band | Changes (presentation and pacing only) |
| --- | --- |
| Junior Explorer (about 8–12) | Simpler *What we know* wording in the Echo Chain; first navigation hint after 12 s; simplified explanation after one wrong answer; two Claim Check statements |
| Young Scientist (about 13–17, default) | Full wording; hint after 18 s; simplified explanation after two wrong answers; three statements |
| Research Explorer (18+) | Full wording; hint after 25 s; simplified explanation after two wrong answers; four statements, including subtle over-generalisations |

The NASA facts, the correct answers and the sources are identical for every band.

**Printable learning summary** (completion screen): a self-contained HTML file with lessons and results (first try / after hints), Echo Chain progress, three discussion questions and the NASA sources. It is generated from the local save; every value is HTML-escaped and nothing is uploaded.

The site's optional email login (`/login/`, Supabase, publishable key only) is separate from the game: the game, its saves and the judge preview do not require an account.

## EKO guidance and learning record

* **Navigation hints** (`src/game/core/guidance.ts`): after 18 s standing still away from the objective, EKO names the compass direction; after a further 40 s it adds a rounded distance and points to the map (M). At most two hints per objective, none while a prompt, puzzle, cutscene or subtitle is showing. Directions use the HUD compass convention (north = −z).
* **Wrong-answer hints**: each puzzle has bilingual, evidence-pointing nudges that rotate on repeated wrong answers and appear inside the puzzle dialog (*EKO* tag). They never reveal the answer and add no new historical claims. Quiz questions can carry an *explain* text shown after a correct answer (what the evidence supports and what it cannot).
* **Learning record** (completion screen, this device only): every puzzle with its learning goal and *First try* / *After hints* / *Not yet*, derived from the save. Nothing is collected or sent.

## Performance measurements

| Date | Device | Browser | Preset / resolution | FPS | Frame time | Draw calls | Triangles |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12 | Developer Windows 11 PC (GPU via ANGLE D3D11) | Headless Chromium (Playwright 1.56.1), `scripts/capture-visuals.mjs` | High, 1.0 | 60 (vsync cap) in all 7 scenes | 0.5–1.2 ms | 26–55 | 0.92–0.99 M |
| 2026-11-12 | Same PC, phone-sized viewport | Headless Chromium | Low, 0.85 | 60 (vsync cap) | 0.9 ms | 47 | 0.17 M |

These are not phone or mid-range GPU results. Real Android/iOS devices are **NOT TESTED**; low-percentile FPS, memory and load times were not measured.

## Tests

* `npm test`: unit tests for content integrity, puzzles, terrain, player/camera/companion, the quest engine, saves, and full-campaign sessions (including save/resume, wrong answers and chapter replay).
* `npm run test:demo`: the story-gating, save/resume round-trip and judge-preview isolation tests only.
* `tests/echo-chain.test.mjs`: Echo Chain content integrity (bilingual, NASA https sources, valid evidence ids, classifications), unlocking across the campaign, exact Claim Check grading per band, save/reload and forged/legacy saves, learner-profile sanitizing, band-based hint pacing and simplified explanations, and HTML escaping in the learning summary. `e2e-game.mjs` also fills in the onboarding (name sanitized, band stored), lights all eight links, fails then passes a Claim Check by clicking, and checks that it survives a reload.
* `tests/nasa-images.test.mjs`: NASA API parsing against a real-shaped response, URL and markup safety, failure/timeout handling, topic filtering, and that every evidence card maps to a valid NASA id. `e2e-game.mjs` checks the blocked/offline fallback on every run; set `GAME_E2E_LIVE_NASA=1` to also check a live NASA record in the browser.
* `tests/guidance.test.mjs`: compass directions, hint timing and caps, rotating wrong-answer hints, the in-dialog hint lifecycle, and the learning record.
* The `window.__LAST_LIGHT__` QA handle can drive the session, so it is installed only in development or when the page is opened with `?qa`. The browser scripts add `?qa`; `e2e-game.mjs` also checks the handle is absent without it.
* `node scripts/e2e-game.mjs` (Playwright, against a served `out/`). Beyond the list below it checks that WASD still works after Pause → Resume (focus on the pause button), clicks through the storm lab UI, and **walks** into the Chapter 4 archive. Later steps are advanced by the session's accessible travel action within a wall-clock deadline; Chapter 4–5 puzzles are answered through the session API there (their validators are unit-tested). Covered: main menu → new game → skippable cinematic → real WASD walking → reach and scan objectives → evidence card → Tab/M/J/pause → chapter completion + autosave → walk to the rover → out-of-order component scans → puzzle wrong-then-right → reload + Continue → all five chapters → completion screen + Passport stamp → museum navigation → 2D console campaign → mobile joystick + sprint toggle → existing museum routes → judge preview (story Chapter Select locked on a fresh save, preview badge, no save written). Set `GAME_SHOTS=<dir>` for screenshots.

## Known limitations

* The Moon link is a record inside the (fictional) Mars archive, not a separate explorable lunar location. No NASA lunar image is shipped locally for it yet.
* Saves written while every chapter was temporarily open (uncommitted WIP, never released) are sanitized back to their last in-order progress.

* Physical-device performance, screen-reader passes and Bangla wording still need human review. The Bangla text was written for this demo and has not been checked by a fluent science educator.
* The astronaut is a generated original character asset, not a motion-captured character. Blender is not required for the checked-in reproducible generator; a Blender `.blend` authoring file is not included in this environment.
* Offline caching of the game route is not added; the existing EKO service worker covers `/play/` assets only on a best-effort basis.
* The rover GLB is placed at an artistic location and scaled to about 1.5 m tall by bounding box. Do not use it to make claims about real dimensions.
