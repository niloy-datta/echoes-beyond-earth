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

- Source ledger in `public/data/sources.json`: currently **59 records, 21 marked `required`**. The latter are mainly NSSDCA spacecraft records and must remain flagged until human verification against primary sources.
- The four EKO clue links are in `src/lib/eko-mission.ts`; each points to a NASA primary source.
- Verify claims and dates, especially the difference between the last *transmitted* image and the last images *captured*. Verify translations with a fluent Bangla science educator.
- Original rover GLB comes from NASA's [Opportunity 3D resource](https://science.nasa.gov/3d-resources/mars-exploration-rover-opportunity-mer-b/); the game world, beacon positions and companion character are artistic, not exact Martian geography.
- Confirm image credits, NASA non-endorsement statement and suitability for students age 8–12.
- **Automated checks verify reference structure and file integrity, not the scientific truth of source claims.**

## Release checklist (do not pre-check without evidence)

### P0 competition and science
- [ ] Obtain written reuse/pre-event-development ruling from organizer; attach decision to [issue #1](https://github.com/niloy-datta/echoes-beyond-earth/issues/1).
- [ ] Review all 21 pending museum records against NASA/NSSDCA originals, then update flags only for documented matches.
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
