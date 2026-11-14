# EKO release gates — independent pre-event learning prototype

> **Do not submit this pre-event demo as a NASA Space Apps 2026 competition entry without written organizer approval.**
> PR #4 was merged into `main` for an independent group demo on October 15, 2026. The planned hackathon is November 14–15, 2026. A GitHub merge, public deployment or passing CI does **not** establish competition eligibility.

## Implemented in the independent demo

- Browser-based EKO Mars mission with four NASA-linked bilingual lessons, local progress and certificate.
- Original NASA/Ames Opportunity GLB in an optional inspector; the playable rover remains a **stylized illustration**.
- Keyboard/touch exploration plus an interactive, low-GPU 2D mission map with equivalent questions.
- Browser speech synthesis (voice availability varies), teacher worksheet and NASA imagery with credits.
- Best-effort offline cache with cached-shell confirmation; the optional original rover inspector needs online dependencies.
- Unit tests, cross-browser smoke tests, 2D focus-return check, Chromium offline-repeat-visit check.
- Integrity/budget gate for sources, bilingual questions, model header and static export.

## Evidence and scientific review

- Source ledger history: the October 17, 2026 validation reported **84 records, 46 flagged** for verification. The November 14, 2026 repository now contains **85 records, all marked `verified` by the project**. These flags are not evidence of independent scientific peer review; a reviewer should independently spot-check mission claims and the original NASA pages.
- The four EKO clue links are in `src/lib/eko-mission.ts`; each points to a NASA primary source.
- Verify claims and dates, especially the difference between the last *transmitted* image and the last images *captured*. Verify translations with a fluent Bangla science educator.
- Original rover GLB comes from NASA's [Opportunity 3D resource](https://science.nasa.gov/3d-resources/mars-exploration-rover-opportunity-mer-b/); the game world, beacon positions and companion character are artistic, not exact Martian geography.
- Confirm image credits, NASA non-endorsement statement and suitability for students age 8–12.
- **Automated checks verify reference structure and file integrity, not the scientific truth of source claims.**
- **Dependencies, 2026-11-12:** `next` raised from 16.4.0 to 16.4.6 after `npm audit` reported a critical advisory for 16.0.0–16.4.0; `npm audit --omit=dev` now reports 0 vulnerabilities. Lunar evidence cards use the repository's existing NASA/JSC photos AS12-48-7121 and AS12-48-7133 (titles from images.nasa.gov).
- **Claim review, 2026-11-12 (NASA/JPL pages read directly):** τ ≈ 10.8 on June 10, 2018, and "previous storm … somewhere above 5.5" (JPL, *Opportunity Hunkers Down During Dust Storm*); PIA22929 / PIA22930 transmitted-vs-captured wording; PIA22909 354 images, sols 5,084–5,111; mission complete Feb. 13, 2019 (JPL). **Removed** as unsupported: a "usual" τ of 0.5 presented as a NASA value (now labelled a model reference value) and "rover needed τ below 2 to recharge" (no NASA source found; the cited JPL "Six things" article now returns 404). Surveyor 3 / Apollo 12 facts restate science.nasa.gov/mission/surveyor-3 and NSSDCA 1967-035A; the Streptococcus contamination story is deliberately **not** used (no NASA statement obtained). Independent human review is still required.

## Release checklist (do not pre-check without evidence)

### P0 competition and science
- [ ] Obtain written reuse/pre-event-development ruling from organizer; attach decision to [issue #1](https://github.com/niloy-datta/echoes-beyond-earth/issues/1).
- [ ] Independently review project-marked source records against original NASA/NSSDCA pages; record reviewers, dates, caveats and any discrepancies. Do not equate a project-ledger `verified` flag with NASA endorsement.
- [ ] Obtain independent review of all four EKO science clues, image dates and English/Bangla wording.
- [ ] Review source attributions, artwork labels and NASA non-endorsement notice.

### P0 device, browser and accessibility
- [ ] Run physical Chrome Android, Safari iOS, Firefox desktop, Safari macOS and low-memory Android checks.
- [ ] Verify low-end performance, load times (LCP/CLS), frame rates, RAM/battery impact and touch controls.
- [ ] Test physical keyboard-only use, focus trap, focus return, screen reader and Bangla reading order.
- [ ] Test offline first visit, warm repeat visit, upgrade, service-worker cache invalidation and refresh.
- [ ] Test the external 3D viewer and Draco decoder both online and blocked/offline.

### P1 learning and visuals
- [ ] User-test story pacing, question comprehension and captions with students age 8–12.
- [ ] Choose a performance-feasible renderer if integrating the **actual** Opportunity GLB into the playable world; keep accurate model orientation/scale and fallback parity.
- [ ] Test 2D story completion on devices with WebGL disabled.
- [ ] Add captioned narration or sound only after accessibility review.

### P2 operations and release
- [ ] Verify `/play/` and `/play/teacher/` on the merged museum site; verify legacy `/eko-preview/` redirects without overwriting the root.
- [ ] Record dependency-security review, content/legal sign-off and manual QA evidence.
- [ ] Prepare the competition project disclosure and sources list **only if** organizers allow this work.
- [ ] Confirm no fabricated last words, made-up telemetry or synthetic images presented as NASA observations.

### P1 THE LAST LIGHT game (`/play/game/`, see [GAME.md](./GAME.md))
- [ ] Measure frame rate on a real GPU desktop (target 60 FPS) and a mid-range Android/iOS phone (target 30 FPS); record the device and the *Show performance* readout. CI only runs SwiftShader software rendering.
- [ ] Play all five chapters with keyboard only, touch only and the 2D console; confirm focus order and that screen readers announce subtitles.
- [ ] Review the Bangla game text (chapters, EKO lines, puzzles, evidence) with a fluent science educator.
- [ ] Have someone outside the team check that every in-game historical statement matches its cited NASA page, and that the storm, archive and finale labels make the artistic reconstruction clear.
- [ ] Force a WebGL context loss (e.g. `WEBGL_lose_context`) on real hardware and confirm *Restart 3D* / *Continue in 2D* recover without losing progress.

## Local verification

```bash
git switch main
npm ci
npm run validate
npm test
npm run typecheck
npm run build
npm run quality:eko
npm run dev
```

The exported static site is in `out/`. In CI, `EKO Browser Smoke` runs Playwright on Chromium, Firefox and WebKit, including a real offline repeat visit on Chromium. `EKO Prototype Quality Check` enforces source integrity and conservative size budgets: single JS 5 MiB, all JS 18 MiB, static export 100 MiB.

Links: [merged PR #4](https://github.com/niloy-datta/echoes-beyond-earth/pull/4), [remaining gates issue #5](https://github.com/niloy-datta/echoes-beyond-earth/issues/5), [NASA official Opportunity mission](https://science.nasa.gov/mission/mer-opportunity/).
