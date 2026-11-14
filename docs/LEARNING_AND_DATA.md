# Quiz Portal, learning outcomes and NASA data

## NASA data actually integrated (parsed, not just linked)

| Dataset | Identifier | What we use | Where |
| --- | --- | --- | --- |
| MER Pancam Science Derived Atmospheric Opacity Data Bundle (PDS Geosciences Node) | `urn:nasa:pds:mer_pancam_derived_opacity`, DOI 10.17189/1518992; data set `MER1/MER2-M-PANCAM-5-ATMOS-OPACITY-V1.0`; product `1TAU880_5106_20181207A` | All 8,639 rows of Opportunity (MER1) Pancam right-camera 880 nm solar opacity, 2004-01-27 to 2018-06-05, reduced to the median tau per sol | Quiz Portal chart and questions; storm lab "OBSERVED" line |

- Raw files (unmodified): `data/nasa/mer1-pancam-opacity/` (`.tab`, `.lbl`, `.xml`, plus the 440 nm table).
- Processing: `node scripts/data/build-mer1-opacity.mjs` → `public/data/nasa/mer1-opacity.json` (provenance included). No interpolation; sols without measurements are absent.
- Values used in the game: typical (median) daily tau 0.689; sol 5102 0.758; sol 5103 1.713; sol 5105 2.259; highest daily median 4.525 (sol 1234, 2007). Tests check that the shipped JSON is reproducible from the raw table and that the in-game numbers match it.
- Limitation: the product ends on June 5, 2018. The tau of about 10.8 on June 10, 2018 is a separate JPL estimate and is labelled that way.
- Metadata-only (linked, not parsed): NASA Image and Video Library records (live lookup on evidence cards), NSSDCA spacecraft records (project ledger currently marks all 85 sources verified, not independently certified), NASA Trek tiles (downloaded imagery, not a measurement product).

## Assessment methodology

- Quick Mission Challenge: a five-question bilingual interactive practice round chooses one source-linked item from each chapter; correct answers and explanations appear instantly. Each replay rotates to different chapter items. Its score is ephemeral and does not modify pre/post results or mastery.

- Competencies: spacecraft hardware, Mars environmental science, NASA mission history, interpreting evidence, observation versus hypothesis.
- Pre- and post-assessments are parallel forms of 10 items (2 per competency), with different questions. The post-assessment opens only after the pre-assessment is complete.
- Chapter quizzes: 5 items per chapter (4 new and 1 reviewed EKO item). There are also 5 optional advanced challenges.
- Scoring uses first-try answers only. Solving after a retry is recorded as "assisted" and never counts as mastery.
- Change = post − pre, in percentage points, overall and per competency, only when both forms are complete. Finishing the game is never treated as evidence of learning.
- Adaptive rules (`src/game/core/assessment.ts`, deterministic): fewer than 2 answered items gives "not enough evidence"; a first-try share below 50% recommends an unanswered chapter item of that competency; 80% or more offers that competency's challenge.
- Age groups 8–10 / 11–13 / 14–17 change wording only (simpler prompts for 8–10); options and answers are identical, so results stay comparable. The game's own learner bands (8–12 / 13–17 / 18+) are a separate, earlier setting for hint pacing.
- Data stays in the browser (`localStorage`); the report is generated locally and contains only assessment results.
- No learner study has been run yet, so this project reports no improvement figures.

## AI-assisted development disclosure

Code, tests, question wording, Bangla translations and documentation in this repository were written with substantial help from an AI coding assistant (Claude, Anthropic) under the team's direction and review. NASA facts were checked against the NASA pages and the PDS product cited for each item; the Bangla text still needs review by a fluent science educator. No AI-generated imagery, video or audio is presented as NASA material.

## Competition permission

The project owner reports that organizer permission has been obtained (recorded 2026-11-13). The written ruling has not been attached to this repository. Attach it (and its scope: whether it covers the October 2026 pre-existing code and pre-event development) before submission.
