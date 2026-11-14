# NASA Space Apps 2026 · Challenge resource trace

Challenge: [Abandoned but not Forgotten — Storytelling about NASA's Discarded Equipment on the Moon and Mars](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=resources).

## Required NASA resource — concrete mapping

The official 2026 challenge Resources tab explicitly lists the **NASA Space Science Data Coordinated Archive (NSSDCA)** and the **Surveyor Landers** and **Spirit & Opportunity** missions.

| Check | Evidence in the project |
| --- | --- |
| Official listed NASA source | [NASA NSSDCA](https://nssdc.gsfc.nasa.gov/) |
| Individual mission record | [Surveyor 3, 1967-035A](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1967-035A) |
| Shipped museum source | `public/data/sources.json`, entry `nssdca:1967-035A` |
| Game evidence | `src/game/content/evidence.ts`, `surveyor-3` and `apollo12-retrieval` |
| Interactive use | `The Last Light`, Chapter 4: Surveyor 3 recovery, NASA photo investigation, Moon-link evidence reasoning and Echo Chain / Claim Check |
| Classroom/2D parity | The same core session, evidence and quizzes are available in the 2D mission console |
| Judges' navigation | `/sources/` includes links to the NASA record and official 2026 Resources tab; `docs/JUDGE_DEMO.md` documents the Chapter 4 demonstration |

The mission record supports the historical account. The game's Moon scene is a **fictional holographic archive**, not an exact lunar surface reconstruction. No real-time NASA telemetry or unrecorded mission transmissions are claimed.

## Additional NASA data (not a substitute for an official-listed source)

The Mars storm activity processes the original [NASA PDS MER Pancam atmospheric-opacity bundle](https://doi.org/10.17189/1518992) through `scripts/data/build-mer1-opacity.mjs`; see `docs/LEARNING_AND_DATA.md`. This is scientifically useful, but the project does not claim that PDS is listed as a qualifying 2026 source unless that listing is independently verified.

## Checks still requiring people or organizers

- Link and record structure passing CI do not certify scientific truth. Independent science and Bangla-language review remain open.
- The current project ledger shows 85 references marked verified and zero marked required. These are **project-maintained labels**, not NASA endorsements or independent peer review.
- The team reports organizer permission for its pre-event code, but the written ruling and scope have not yet been attached to the repository.
- Official Global Award eligibility is determined by organizers, not by this document.
