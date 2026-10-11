# Echoes Beyond Earth

**The machines went silent. The knowledge kept traveling.**

An interactive journey through the scientific legacy of spacecraft left on the Moon and Mars. Explore real NASA mission records, investigate historical discoveries, and experience a story-driven 3D Mars expedition — directly in your browser.

**[Explore the Website](https://echoes-beyond-earth.onrender.com/)** · **[Play The Last Light](https://echoes-beyond-earth.onrender.com/play/game/)** · **[Browse NASA Evidence](https://echoes-beyond-earth.onrender.com/sources/)**

> **Independent educational project.** Echoes Beyond Earth is not affiliated with, endorsed by, or an official product of NASA. This pre-event project is **not an approved NASA Space Apps Challenge 2026 submission**. Competition eligibility and any reuse must be confirmed with the organizers.

---

## The Experience

Space missions can end while their discoveries continue to shape new ones. Echoes Beyond Earth connects the machines, images, places, and evidence behind that idea through three complementary experiences:

| Experience | What you can do |
| --- | --- |
| **The Last Light** | Explore Mars in a five-chapter, third-person adventure with EKO, Opportunity, puzzles, and original cinematic storytelling. |
| **Planetary Museum** | Explore Moon and Mars missions, compare historical images, trace mission timelines, and follow scientific legacies. |
| **Mission Stories** | Play short educational missions, investigate equipment, explore 3D scenes, and test what you learn. |

### The Last Light — Mars Expedition

**[Launch the 3D Game →](https://echoes-beyond-earth.onrender.com/play/game/)**

An interactive reconstruction inspired by NASA's Opportunity mission. You explore a Martian landscape alongside **EKO**, a fictional companion, and piece together the scientific record of a remarkable rover.

**Five story chapters**

1. **The Awakening** — arrive on Mars, learn to explore, and recover the first memory.
2. **Footprints in the Dust** — investigate Opportunity's wheels, solar panels, and camera mast.
3. **The Great Storm** — examine the 2018 dust storm and how reduced sunlight affected the solar-powered rover.
4. **Echoes of the Past** — restore mission records, photographs, and a timeline of discoveries.
5. **The Last Light** — assemble the evidence and complete the expedition.

**Gameplay highlights**

- Third-person exploration with walking, sprinting, jumping, camera controls, and Mars-gravity-inspired movement.
- Mission objectives, rover inspections, science puzzles, and evidence collection.
- Original EKO companion, narrative cutscenes, subtitles, and an in-game journal.
- Autosave, resume, chapter replay, achievements, and Explorer Passport progress.
- Graphics presets, responsive touch controls, and a **2D mission console** for devices without WebGL.
- English and Bangla interface support.

The 3D landscape, astronaut, EKO, cinematics, and mission locations are **artistic reconstructions**. Historical mission claims are supported by linked source material rather than presented as simulated NASA telemetry.

### Explore the Museum

| Destination | Description |
| --- | --- |
| [Planetary Explorer](https://echoes-beyond-earth.onrender.com/explore/) | Moon/Mars explorer with mission markers and a time-machine view. |
| [The Last Signal](https://echoes-beyond-earth.onrender.com/last-signal/) | Learn why some equipment can still return a signal while other missions have ended. |
| [Silent Archive](https://echoes-beyond-earth.onrender.com/archive/) | Search and filter historical space hardware. |
| [Memory Lens](https://echoes-beyond-earth.onrender.com/lens/) | Compare images and perspectives across missions and eras. |
| [Discovery Paths](https://echoes-beyond-earth.onrender.com/paths/) | Follow guided connections between spacecraft and discoveries. |
| [Legacy Ripple](https://echoes-beyond-earth.onrender.com/legacy/) | Trace how scientific knowledge carries forward. |
| [Evidence & Sources](https://echoes-beyond-earth.onrender.com/sources/) | Inspect source references and verification status. |

### Mission Stories and Learning

The **[Mission Stories hub](https://echoes-beyond-earth.onrender.com/missions/)** includes narrated Moon/Mars missions featuring **Bhulu**, an original cartoon astronaut companion, alongside:

- Interactive mission scenes and location challenges.
- A quiz arena and searchable object catalog.
- A 3D mission park with on-screen exploration and experimental WebXR support.
- English/Bangla content, educational records, and locally stored progress.

Some mission positions or interpretations are approximate; their verification status is surfaced rather than concealed.

---

## Technology

| Layer | Stack |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| 3D game | Three.js, WebGL, glTF/GLB, Draco/Meshopt-compatible assets |
| Planetary maps | MapLibre GL and locally prepared map tiles |
| Interface and motion | Tailwind CSS, Framer Motion |
| Content | Local JSON, GeoJSON, mission catalog, and referenced NASA imagery |
| Persistence | Browser localStorage for supported settings and progress |
| Delivery | Static Next.js export; no application server, user accounts, or database required |

The core game simulation is shared between its 3D renderer and 2D console. Three.js is loaded only when the 3D experience is needed.

## Run Locally

**Requirements:** Node.js and npm (use a version compatible with the installed Next.js release).

~~~bash
git clone https://github.com/niloy-datta/echoes-beyond-earth.git
cd echoes-beyond-earth
npm ci
npm run dev
~~~

Open **http://localhost:3000**.

To build and serve the static production output:

~~~bash
npm run build
npm start
~~~

The exported site is written to **out/**. The project also supports a configurable base path for static hosts via **NEXT_PUBLIC_BASE_PATH**.

### Game Controls

| Action | Desktop |
| --- | --- |
| Move | WASD or arrow keys |
| Look around / zoom | Mouse drag / scroll |
| Sprint / jump | Shift / Space |
| Interact or scan | E |
| First-person inspection | V |
| Evidence / map / journal | Tab / M / J |
| Advance dialogue / skip cinematic | Enter |
| Pause | Esc |

Touch devices have on-screen movement and interaction controls. Game URL options include **?force2d**, **?quality=low**, **?quality=medium**, **?quality=high**, and **?quality=ultra**.

## Quality Checks

~~~bash
npm run typecheck
npm run validate
npm test
npm run quality:eko
npm run build
~~~

An end-to-end browser test script is available at **scripts/e2e-game.mjs**. It uses Playwright against a running build and covers the campaign and major interaction flows; see [GAME.md](./GAME.md) for setup and test details.

**Important:** Passing automated tests does not establish scientific peer review, physical-device performance, or full accessibility certification.

## Project Structure

~~~text
src/
  app/              Website, museum, games, and learning routes
  components/       Shared UI and immersive landing sections
  game/
    content/        Five chapters, evidence, puzzles, cutscenes
    core/           Movement, terrain, quests, saves, simulation
    engine/         Three.js world, astronaut, rover, effects
    ui/             Game menus, HUD, panels, 2D console
  missions/         Mission Stories and educational interactions
public/
  data/             Mission records, image sources, catalogs
  images/nasa/      Referenced NASA photography
  models/           Spacecraft and game GLB assets
  textures/game/    Game material textures
scripts/            Validation, asset generation, data tools
tests/              Automated integrity and gameplay tests
~~~

For deeper technical documentation, see **[Game Design & Engineering](./GAME.md)**, **[EKO Prototype Notes](./EKO_PROTOTYPE.md)**, and **[EKO Release Gates](./EKO_RELEASE_GATE.md)**.

## Scientific Integrity & Credits

This experience distinguishes **historical evidence**, **educational simplification**, and **artistic reconstruction**.

- Original mission photography, publicly available NASA information, and cited records are used as educational references.
- The source ledger records verification status; entries marked **Source verification required** are not presented as independently verified.
- Fictional dialogue is not represented as authentic rover communication. The game does not recreate real NASA telemetry.
- Spacecraft model attributions are documented in [NASA model credits](./public/models/nasa/CREDITS.md); additional image references are tracked in **public/data/sources.json**.
- NASA imagery and identifiers are credited to their respective sources. Their use does not imply NASA approval or endorsement.

### Project Status

**Independent, publicly accessible educational prototype.** Features, visual quality, device compatibility, and scientific references continue to be reviewed. Any future competition submission is subject to the organizer's rules and separate eligibility confirmation.

---

**[Visit the Museum](https://echoes-beyond-earth.onrender.com/)** · **[Enter the Mars Game](https://echoes-beyond-earth.onrender.com/play/game/)** · **[Review the Evidence](https://echoes-beyond-earth.onrender.com/sources/)**

*The mission may end. The discovery continues.*
