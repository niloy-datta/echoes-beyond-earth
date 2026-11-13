# The Last Light: judge demo package

> **Status: independent pre-event prototype.** This is not an approved NASA Space Apps 2026 submission, and it is not affiliated with or endorsed by NASA. The proposed scripts below are preparation material: confirm the actual submission format (video length, links, slides) in the official 2026 event guidance, and get the organizers' written ruling on reusing this pre-event work before submitting any of it.

Challenge: *Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars.*
Core message: **"The machines went silent. The knowledge kept traveling."**

Everything listed here exists in the build and is covered by the automated tests named in [GAME.md](../GAME.md). Screenshots in [`demo-screens/`](demo-screens/) were captured from the 2026-11-12 build by the Playwright suite (headless Chromium on a developer PC, not a phone).

## 90-second live walkthrough (proposed)

Use **Judge preview** in the main menu. It opens any chapter, saves nothing, earns no achievements and shows a *Preview · not saved* badge. Add `?quality=low` on a weak machine, or `?force2d` for the 2D console.

| Time | Do | Say (one line) | Real feature |
| --- | --- | --- | --- |
| 0–15 s | Main menu → *Judge preview* | "Robots we left on the Moon and Mars went silent. Their knowledge didn't. You recover it as evidence." | Menu, disclaimer, preview isolation |
| 15–30 s | Chapter 02: walk to NASA's Opportunity model, scan wheels / panels / mast | "This is NASA's own 3D Opportunity model. Every scan unlocks a NASA record." | Third-person movement, NASA/Ames GLB, evidence cards |
| 30–45 s | Open an evidence card → *Check NASA's live archive record* | "The card isn't just our word: we pull NASA's own record from the NASA Image and Video Library and compare." | Live `images-api.nasa.gov` check (offline → honest fallback) |
| 45–60 s | Chapter 03 storm lab: commit a prediction, drag τ, compare | "Predict first, then experiment. The model is labelled SIMULATED; JPL's τ 10.8 is labelled OBSERVED." | Prediction-gated lab, Beer–Lambert model vs JPL record |
| 60–75 s | Pause → *Judge preview* → **Chapter 05** → press **C** (Echo Chain) | "Same reasoning on the Moon: Surveyor 3 went silent in 1967; Apollo 12 astronauts walked up to it and brought parts home." | Echo Chain: Hardware → Evidence → Discovery → Legacy for both missions (a Chapter 05 preview has all 8 links lit; a Chapter 04 preview starts before the lunar record, with Opportunity 3/4 and Surveyor 3 0/4) |
| 75–90 s | Do the Claim Check: mark "still sending pictures" as *Not supported* | "Players learn to separate what we know, what we interpret and what isn't supported. That's the legacy we teach." | Claim Check grading, learning record, printable summary |

Fallbacks: if WebGL fails, the same steps work in the 2D console (same `GameSession`). If the network is down, step 30–45 shows the stored NASA copy and says the archive is unreachable. Use the screenshots in `demo-screens/` as backup slides.

## 30-second video concept (proposed)

1. (0–5 s) Black screen, a dark incomplete image: PIA22929. Caption: *"June 10, 2018. Opportunity's last transmission."*
2. (5–12 s) Gameplay: the explorer walks up to NASA's Opportunity model; EKO: "Let's find out what it left us."
3. (12–20 s) Storm lab: τ slider darkens the sky; tags *SIMULATED* vs *OBSERVED*.
4. (20–27 s) Echo Chain board lights up Mars and Moon links; the Claim Check flags a myth as *Not supported*.
5. (27–30 s) Title: *Echoes Beyond Earth: The machines went silent. The knowledge kept traveling.* + "Independent educational project · NASA data cited".

Do not present pre-rendered footage as real-time gameplay, and caption any cinematic as an artistic reconstruction (the game already labels its storm cutscene that way).

## Science one-pager

| Claim used in the game | Classification | NASA source |
| --- | --- | --- |
| τ ≈ 10.8 on June 10, 2018; previous storm "somewhere above 5.5" | Verified NASA record (estimate) | JPL, *Opportunity Hunkers Down During Dust Storm* |
| PIA22929 = last image **transmitted**, incomplete; PIA22930 = last images **taken**, only thumbnails sent | Verified NASA record | NASA Photojournal PIA22929, PIA22930 |
| Legacy Pan: 354 Pancam images, sols 5,084–5,111 (May 13 – June 10, 2018) | Verified NASA record | NASA Photojournal PIA22909 |
| Mission declared complete Feb. 13, 2019; designed for 90 days, explored 15+ years | Verified NASA record | JPL, *Opportunity Rover Mission on Mars Comes to End* |
| Hematite (forms in water) found at the landing site; Meridiani Planum "may have been habitable" | Supported scientific interpretation | Same JPL page |
| Sky darkening at τ 1–11 | Educational simulation (NASA's) | NASA PIA22521 *Shades of Martian Darkness* |
| Storm-lab e^−τ curve with a τ 0.5 reference | Educational simulation (ours) | Labelled in-game as a model value, not a measurement |
| Surveyor 3 landed April 20, 1967 (UT); last contact May 4, 1967; first Surveyor with a surface sampler | Verified NASA record | science.nasa.gov/mission/surveyor-3, NSSDCA 1967-035A |
| Lunar soil solid enough to support an Apollo Lunar Module | Supported scientific interpretation | science.nasa.gov/mission/surveyor-3 |
| Apollo 12 landed ~180 m (600 ft) away; TV camera, scoop and other parts returned to study ~2.5 years of exposure | Verified NASA record | science.nasa.gov *Apollo 12 and Surveyor 3*; NSSDCA |

Deliberately **not** used: invented rover "last words", a "τ below 2 to recharge" threshold, a "usual τ 0.5" NASA value, and the Surveyor 3 bacteria story (no NASA statement obtained). The museum's 46 NSSDCA records remain flagged *Source verification required*.

## Internal readiness review (not a NASA score)

Uses the commonly published Space Apps judging themes as a checklist. No official 2026 weights are assumed; confirm against the 2026 Judging & Awards Guide.

| Theme | Strengths (evidence) | Gaps / missing validation | Next improvement |
| --- | --- | --- | --- |
| Impact | Five-chapter campaign plus a Moon mission; learning record and printable summary; optional age bands | No real learner testing yet | Run the five-question learner check below with real students |
| Creativity | Echo Chain + Claim Check turn NASA evidence into player decisions; live NASA archive comparison | Moon is a record and board, not an explorable lunar scene | A small explorable Surveyor 3 site (reuse the engine) |
| Validity | Claims traced to NASA pages read 2026-11-12; 62 unit + 23 browser checks per engine | Independent science review and Bangla review not done; 46 museum records pending | External reviewer pass; Bangla educator pass |
| Relevance | Both challenge worlds: Opportunity (Mars) and Surveyor 3 / Apollo 12 (Moon), both silent hardware | Official Resources-tab mapping not confirmed (site unreachable from this machine) | Map at least one Resources-tab dataset to a visible interaction |
| Presentation | Judge preview, 90-second script, backup screenshots, 2D and offline fallbacks | No recorded video; no phone FPS measurements | Record the 30-second video; measure on one Android and one iPhone |

## Learner check (to run with real learners; no results yet)

1. Can the learner navigate to the rover without help?
2. Can they name one Opportunity instrument and what it did?
3. Can they describe one mission discovery?
4. Can they say which of two statements is an observation and which is an interpretation?
5. Can they explain why a silent spacecraft can still be scientifically useful?

Record only counts and anonymous answers. Do not publish participant numbers or improvement percentages until the test has actually been run.
