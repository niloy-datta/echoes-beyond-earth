# EKO / Opportunity — independent educational demo

**Created October 15, 2026 as pre-event experimentation. Squash-merged into `main` in PR #4 for independent group demonstration. Do not present this as a NASA Space Apps 2026 hackathon-period submission.** The original museum HEAD is backed up at `backup/main-before-eko-demo-2026-10-15`; organizer approval for competition reuse has not been received.

## Phase 2 implementation (October 15, 2026)

The independent pre-event prototype now includes:

- Four NASA-sourced bilingual clues with quiz validation and locally saved progress.
- Deterministic player movement / nearby beacon mechanics and unit tests.
- User-selectable guided reading and keyboard-friendly 2D fallback.
- Procedural 3D Mars scene with 30 FPS target, reduced-motion frame throttling and lost-WebGL-context fallback.
- **Actual NASA/Ames Opportunity GLB** vendored at `public/models/opportunity-mer-b.glb` from `nasa/NASA-3D-Resources` (NASA Git blob SHA `4e154ed38a6d4bf128ecb52f7231baed716c4f55`).
- Optional on-demand authentic rover inspector via the pinned Google `<model-viewer>` web component. That model uses Draco compression; its decoder and web component require internet the first time.
- Original PIA22929 last transmitted *partial* image, contrasted correctly with PIA22930 last *captured* thumbnails. NASA-hosted image, not AI generated.
- PIA23178 original traverse map, primary-source credits and historical timeline.
- Optional built-in browser speech synthesis in English / Bangla (availability varies with installed voices).
- Downloadable self-guided mission SVG certificate (no student name collected).
- Bilingual printable 10–15 minute teacher worksheet and answer key at `/play/teacher/`.
- Installable PWA manifest and scoped same-origin service-worker caching for return visits.
- CI unit tests, NASA GLB integrity check, offline script syntax, TypeScript and production static-export build.

**Limitations & work that still needs independent browser QA:**
- Main game uses its own stylized rover; the authentic NASA model is an interactive inspection exhibit, not yet mapped into gameplay.
- Neither real Rover telemetry nor recovered sound/words are simulated.
- Offline support is a best-effort cache of assets already accessed; initial visit and Draco model viewer need an internet connection.
- Certificate is an educational reward, not an official NASA certificate.
- Automated browser smoke tests pass on Chromium, Firefox and WebKit; physical-device, screen-reader, color-contrast and GPU stability checks still require manual verification.
- Scientific narrative has citations but has not been independently reviewed by NASA.
- Existing museum still contains 21 source references marked `required`; do not quietly upgrade them to verified without evidence.

### Development / checks
```bash
git fetch origin
git switch main
npm ci
npm test
npm run validate
npm run typecheck
npm run build
npm run dev
```

Visit `/play/` for the adventure and `/play/teacher/` for the worksheet. The `main` deployment now contains EKO alongside the existing museum.

## THE LAST LIGHT (third-person game, October 15, 2026)

`/play/game/` extends this prototype into a five-chapter third-person game (Three.js, lazy-loaded) that places the **actual** NASA/Ames Opportunity GLB in the playable world, decoded with a same-origin Draco decoder. It reuses the four reviewed EKO clues for its final challenge and keeps the same honesty rules. It has the same pre-event status: not a competition submission. See [GAME.md](./GAME.md).

## Open locally

```bash
npm ci
npm run typecheck
npm run validate
npm run build
npm run dev
```

Open `http://localhost:3000/play/` (the homepage also has a new EKO entry).

## Implemented

- Procedural WebGL 3D Mars illustration, independent of additional packages and compatible with Next.js static export.
- Original EKO robot, stylized six-wheel rover, terrain, evidence beacons.
- WASD/arrows movement, mobile-friendly step controls, drag-to-turn camera, E to scan nearby evidence.
- Fully reachable direct evidence list, no-WebGL 2D fallback and reduced-motion handling.
- Four cited NASA evidence interactions and multiple-choice checks, English/Bangla.
- LocalStorage completion tracking; after all 4 answers, discovers the Opportunity object in the existing Explorer Passport.
- Existing NASA PIA23178 traverse map teaser on the homepage, with credit.
- Isolated quality workflow: `npm ci`, data validate, typecheck, static build.

## What this prototype is NOT

- The 3D environment is **not** actual Mars terrain or a reconstruction of Opportunity's historical location.
- The stylized rover is **not** NASA's accurate GLB model. For later work, see [NASA's original GLB](https://science.nasa.gov/3d-resources/mars-exploration-rover-opportunity-mer-b/).
- No real-time rover telemetry, voice transmission, or missing-image reconstruction is claimed.
- This is **not** a NASA-endorsed product or a rule-compliant contest submission.

## Scientific primary sources

1. [NASA Opportunity mission record](https://science.nasa.gov/mission/mer-opportunity/) — mission dates.
2. [NASA Opportunity final traverse map](https://science.nasa.gov/photojournal/opportunitys-final-traverse-map/) — 45.16 km journey.
3. [NASA last transmitted full-frame image](https://science.nasa.gov/photojournal/opportunitys-last-message/) — June 10, 2018. Do not confuse with last captured thumbnails.
4. [NASA mission end announcement](https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/) — dust storm and 2019 end.
5. [NASA Opportunity original 3D asset](https://science.nasa.gov/3d-resources/mars-exploration-rover-opportunity-mer-b/) — optional future model source.

## Competition eligibility

The [official 2026 Space Apps local event guidance](https://www.spaceappschallenge.org/2026/local-events/santiago-dominican-republic/) says preparation is allowed but participants cannot develop the solution they intend to submit before **November 14–15, 2026**. This repository has October 2026 code. **Ask the local lead/global organizing team for a written reuse ruling before submitting any portion of this project.** Neither an isolated branch nor a draft PR makes pre-event implementation contest-eligible.

## Manual QA still needed

- [ ] Test Chrome, Firefox, Safari and small-memory mobile devices.
- [ ] Confirm keyboard and screen-reader modal focus behavior in the browser.
- [ ] Verify actual feel and lighting of WebGL camera/rover on physical hardware.
- [ ] Confirm the public GitHub Pages `/play/` and `/play/teacher/` routes work on desktop and physical phones.
- [ ] Verify sources, accessibility and NASA imagery credits independently.
