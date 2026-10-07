# ECHOES BEYOND EARTH

**The machines went silent. The knowledge kept traveling.**

An interactive museum of the machines NASA left on the Moon and Mars — and of what they sent home.
Built for the NASA Space Apps Challenge 2026. Frontend only: a fully static site with no backend,
database, accounts, API routes or server actions.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # validates data, then exports a static site to ./out
npm start          # serves ./out
```

`./out` can be deployed to any static host (GitHub Pages, Netlify, Vercel, S3, a USB stick + `python -m http.server`).

## Host on GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source.
3. The `Deploy to GitHub Pages` workflow builds and publishes the site on each push to `main`. Find the URL in **Settings → Pages** or the workflow's deployment summary.

The workflow sets the URL prefix from the repository name. A repository named `<username>.github.io` publishes at the domain root; other repositories publish at `https://<username>.github.io/<repository>/`. For a custom domain at the root, set the workflow's `NEXT_PUBLIC_BASE_PATH` to an empty string and `NEXT_PUBLIC_SITE_ORIGIN` to the custom domain's origin before building.

## Exhibits

| Route | Exhibit |
| --- | --- |
| `/` | Cinematic landing — Artemis II Earthset, prologue, retroreflectors, the silence timeline |
| `/explore/` | Moon/Mars globe (MapLibre GL, globe projection) with mission markers and the 1960–2026 Time Machine |
| `/last-signal/` | Send a signal to a silent machine; the Apollo 11/15 mirrors answer, everything else doesn't |
| `/archive/` | The Silent Archive — searchable in English and Bangla, filterable by world, status and decade |
| `/paths/` | Discovery Paths — guided routes that step through Memory Capsules |
| `/lens/` | Memory Lens — then/now comparisons (1968/2026, 1969/2009, 2019/2022, 2021/2024) |
| `/legacy/` | Legacy Ripple — how knowledge moved from one mission to the next |
| `/sources/` | Evidence — every source and its verification status |
| `/passport/` | Explorer Passport — stamps and progress |

Memory Capsules open full-screen over any page and are deep-linkable: `/#capsule=opportunity`.

## Data — and the honesty rules

All mission content lives in local structured files:

- `public/data/objects.geojson` — the machines: location, dates, status, sources
- `public/data/stories.json` — capsules, lens pairs, paths, ripples, timeline (English + Bangla)
- `public/data/sources.json` — image credits and the reference ledger
- `src/data/strings.json` — interface text (English + Bangla; the type-checker fails if a Bangla key is missing)

Every date, coordinate, fact and connection carries a `verification` flag:

- **`verified`** — checked against an official NASA caption fetched from `images-api.nasa.gov` while compiling.
- **`required`** — a source is recorded but was not confirmed. The UI labels these **“Source verification required”**.

Nothing is invented: no telemetry, no quotes, no generated imagery. Unknown locations (Mars Polar Lander,
Ingenuity's final airfield) have `null` geometry and appear in the archive but not on the globe. Coordinates
are rounded and flagged until the team confirms them against NSSDCA/LROC/HiRISE. Opportunity's popular
“last words” are explicitly labelled as a paraphrase, not a transmission.

**Before judging:** work through `/sources/` → “Needs verification” and flip each confirmed item to `verified`.
`npm run validate` checks every cross-reference.

## Imagery and basemaps

- Photos: NASA Image and Video Library (31 images, IDs and credits in `sources.json`), fetched by `scripts/fetch_images.py`.
- Moon basemap: LRO WAC Global Mosaic (NASA Moon Trek). Mars basemap: Viking MDIM 2.1 colour mosaic (NASA Mars Trek).
  `scripts/build_tiles.py` downloads the equirectangular mosaics and re-projects them into local Web-Mercator tiles
  (`public/tiles`), so the globe needs no tile server.

NASA imagery is generally not subject to copyright in the United States; its use does not imply NASA endorsement.
This project is not affiliated with or endorsed by NASA.

## Accessibility & motion

- Full keyboard support: skip link, focus-trapped menu and capsules (Esc closes), focusable map markers, range-input Time Machine and Lens.
- `prefers-reduced-motion` respected, plus an in-site “Reduce motion” toggle.
- Sound is generative Web Audio, off by default, started only by the visitor.
- `localStorage` holds only language, settings and passport progress.

## Build notes

- `scripts/copy-maplibre-worker.mjs` (pre-dev/pre-build) copies MapLibre 6's module worker into `public/vendor`.
- `scripts/flatten-prefetch.mjs` (post-build) copies nested segment-prefetch files to the flat names the
  Next.js client requests, so client-side navigation prefetching works on plain static hosts.
