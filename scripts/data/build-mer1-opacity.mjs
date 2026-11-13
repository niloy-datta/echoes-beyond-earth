// Build public/data/nasa/mer1-opacity.json from NASA PDS product 1TAU880_5106_20181207A.
//
// Source: PDS Geosciences Node, "MER Pancam Science Derived Atmospheric Opacity
// Data Bundle" (urn:nasa:pds:mer_pancam_derived_opacity, DOI 10.17189/1518992),
// data set MER1/MER2-M-PANCAM-5-ATMOS-OPACITY-V1.0. "1" = MER1 = Opportunity.
// Raw files are kept unmodified in data/nasa/mer1-pancam-opacity/.
//
// Processing (documented in the output): parse every row of the fixed-format
// ASCII table, keep finite opacity values, group by integer sol (floor of the
// LOCAL_TIME column, which counts sols since landing), and keep the median
// opacity per sol plus the number of measurements. No values are invented or
// interpolated; sols without measurements are simply absent.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const RAW = "data/nasa/mer1-pancam-opacity/1tau880_5106_20181207a.tab";
const OUT = "public/data/nasa/mer1-opacity.json";

export function parseOpacityTable(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('"')) continue; // header lines are plain text
    const m = line.match(/^"([^"]+)",\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+)\s*$/);
    if (!m) continue;
    const [, product, ls, dist, localTime, airmass, flux, tau, err] = m;
    const r = { product, ls: +ls, dist: +dist, localTime: +localTime, airmass: +airmass, flux: +flux, tau: +tau, err: +err };
    if ([r.ls, r.localTime, r.tau].every(Number.isFinite)) rows.push(r);
  }
  return rows;
}

export function medianBySol(rows) {
  const bySol = new Map();
  for (const r of rows) {
    const sol = Math.floor(r.localTime);
    if (!bySol.has(sol)) bySol.set(sol, []);
    bySol.get(sol).push(r.tau);
  }
  return [...bySol.entries()].sort((a, b) => a[0] - b[0]).map(([sol, taus]) => {
    const s = [...taus].sort((a, b) => a - b);
    const mid = s.length >> 1;
    const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    return [sol, Math.round(median * 1000) / 1000, taus.length];
  });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/").replace(/^([A-Za-z]):/, "/$1:")}` || process.argv[1]?.endsWith("build-mer1-opacity.mjs")) {
  const rows = parseOpacityTable(readFileSync(RAW, "latin1"));
  const sols = medianBySol(rows);
  const out = {
    provenance: {
      title: "MER Pancam Science Derived Atmospheric Opacity Data Bundle",
      bundle: "urn:nasa:pds:mer_pancam_derived_opacity",
      doi: "10.17189/1518992",
      dataSet: "MER1/MER2-M-PANCAM-5-ATMOS-OPACITY-V1.0",
      product: "1TAU880_5106_20181207A",
      url: "https://pds-geosciences.wustl.edu/mer/mer1_mer2-m-pancam-5-atmos-opacity-v1/merao_1xxx/data/1tau880_5106_20181207a.tab",
      rover: "Opportunity (MER1 / MER-B)",
      instrument: "Pancam right camera, 880 nm solar filter (target: Sun)",
      coverage: { start: "2004-01-27T08:03:18", stop: "2018-06-05T13:03:59" },
      units: "atmospheric opacity tau (dimensionless); sol = Martian days since landing",
      credit: "NASA/JPL-Caltech/Cornell; archived by the PDS Geosciences Node",
      processing: "All rows parsed; median tau per integer sol (floor of LOCAL_TIME); n = measurements that sol. No interpolation.",
      note: "This product ends on sol 5106 (June 5, 2018). The tau of about 10.8 on June 10, 2018 is a separate JPL estimate, not part of this table.",
      rowsParsed: rows.length,
    },
    columns: ["sol", "tau_median", "n"],
    sols,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  const last = sols.at(-1);
  console.log(`rows ${rows.length}, sols ${sols.length}, first sol ${sols[0][0]}, last sol ${last[0]} tau ${last[1]}, max tau ${Math.max(...sols.map((s) => s[1]))}`);
}
