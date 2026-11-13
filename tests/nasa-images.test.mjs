import test from "node:test";
import assert from "node:assert/strict";
import { parseItem, parseSearch, safeNasaUrl, plainText, isNasaId, fetchNasaRecord, relatedNasaImages, recordPage } from "../src/lib/nasa-images.ts";
import { NASA_ARCHIVE, EVIDENCE_BY_ID } from "../src/game/content/evidence.ts";

// Shape copied from a real images-api.nasa.gov response for PIA22929 (2026-11-12), trimmed.
const item = {
  href: "https://images-assets.nasa.gov/image/PIA22929/collection.json",
  data: [{
    center: "JPL", date_created: "2019-03-12T00:00:00Z", media_type: "image", nasa_id: "PIA22929",
    secondary_creator: "NASA/JPL-Caltech/Cornell/ASU", title: "Opportunity's Last Message",
    description: "Taken on June 10, 2018 <b>(sol 5,111)</b> this &quot;noisy&quot;, incomplete image was the last data NASA's Opportunity rover sent back.",
    keywords: ["Mars Exploration Rover (MER)", "Mars"],
  }],
  links: [
    { href: "https://images-assets.nasa.gov/image/PIA22929/PIA22929~small.jpg", rel: "alternate", render: "image" },
    { href: "http://images-assets.nasa.gov/image/PIA22929/PIA22929~thumb.jpg", rel: "preview", render: "image" },
  ],
};
const body = (items) => ({ collection: { version: "1.1", items } });
const okFetch = (json) => async () => ({ ok: true, json: async () => json });

test("nasa-images: parses a real-shaped record safely", () => {
  const r = parseItem(item);
  assert.equal(r.nasaId, "PIA22929");
  assert.equal(r.title, "Opportunity's Last Message");
  assert.equal(r.center, "JPL");
  assert.equal(r.credit, "NASA/JPL-Caltech/Cornell/ASU");
  assert.equal(r.dateCreated, "2019-03-12T00:00:00Z");
  assert.ok(!/[<>]/.test(r.description) && r.description.includes('"noisy"'), r.description);
  assert.equal(r.thumb, "https://images-assets.nasa.gov/image/PIA22929/PIA22929~thumb.jpg", "http asset links are upgraded to https");
  assert.equal(r.page, "https://images.nasa.gov/details/PIA22929");
});

test("nasa-images: rejects malformed data and non-NASA or unsafe URLs", () => {
  for (const bad of [null, 1, {}, { data: [] }, { data: [{ nasa_id: "x y", title: "t" }] }, { data: [{ nasa_id: "PIA1", title: "" }] }]) assert.equal(parseItem(bad), null);
  assert.deepEqual(parseSearch(null), []);
  assert.deepEqual(parseSearch({ collection: { items: "nope" } }), []);
  assert.equal(safeNasaUrl("https://evil.example/x.jpg"), null);
  assert.equal(safeNasaUrl("https://nasa.gov.evil.example/x.jpg"), null);
  assert.equal(safeNasaUrl("javascript:alert(1)"), null);
  assert.equal(safeNasaUrl("ftp://images-assets.nasa.gov/a.jpg"), null);
  assert.equal(safeNasaUrl("http://images-assets.nasa.gov/a.jpg"), "https://images-assets.nasa.gov/a.jpg");
  const spoof = parseItem({ ...item, links: [{ href: "https://evil.example/t.jpg", rel: "preview" }] });
  assert.equal(spoof.thumb, null);
  assert.equal(plainText("<script>x</script>a &amp; b"), "x a & b");
  assert.ok(plainText("word ".repeat(400)).length <= 702);
  assert.ok(!isNasaId("../etc") && isNasaId("AS12-48-7121"));
  assert.equal(recordPage("A B"), "https://images.nasa.gov/details/A%20B");
});

test("nasa-images: fetch succeeds, fails closed on errors, and never throws", async () => {
  const rec = await fetchNasaRecord("PIA22929", { fetcher: okFetch(body([item])) });
  assert.equal(rec?.title, "Opportunity's Last Message");
  // Only an exact id match counts.
  assert.equal(await fetchNasaRecord("PIA99999", { fetcher: okFetch(body([item])) }), null);
  assert.equal(await fetchNasaRecord("PIA00001", { fetcher: async () => ({ ok: false, json: async () => ({}) }) }), null);
  assert.equal(await fetchNasaRecord("PIA00002", { fetcher: async () => { throw new TypeError("offline"); } }), null);
  assert.equal(await fetchNasaRecord("PIA00003", { fetcher: async () => ({ ok: true, json: async () => { throw new SyntaxError("bad"); } }) }), null);
  const slow = (_url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
  assert.equal(await fetchNasaRecord("PIA00004", { fetcher: slow, timeoutMs: 30 }), null);
  assert.equal(await fetchNasaRecord("bad id", { fetcher: okFetch(body([item])) }), null);
  // Requests carry no credentials or referrer.
  let seen;
  await fetchNasaRecord("PIA00005", { fetcher: async (url, init) => { seen = { url, init }; return { ok: true, json: async () => body([]) }; } });
  assert.match(seen.url, /^https:\/\/images-api\.nasa\.gov\/search\?/);
  assert.equal(seen.init.credentials, "omit");
  assert.equal(seen.init.referrerPolicy, "no-referrer");
  const rel = await relatedNasaImages("Opportunity", 4, "PIA22929", { fetcher: okFetch(body([item, { ...item, data: [{ ...item.data[0], nasa_id: "PIA22930", title: "Last Images Opportunity Took" }] }])) });
  assert.deepEqual(rel.map((r) => r.nasaId), ["PIA22930"]);
});

test("nasa-images: every archive mapping points at a known card and a valid NASA id", () => {
  for (const [id, entry] of Object.entries(NASA_ARCHIVE)) {
    assert.ok(EVIDENCE_BY_ID.has(id), `unknown card ${id}`);
    if (entry.nasaId) assert.ok(isNasaId(entry.nasaId), entry.nasaId);
    assert.ok(entry.related.trim().length > 2);
  }
  for (const id of EVIDENCE_BY_ID.keys()) assert.ok(NASA_ARCHIVE[id], `no archive entry for ${id}`);
});

test("nasa-images: related results stay on the card's world and ids are compared case-insensitively", async () => {
  const mk = (nasa_id, title, keywords = []) => ({ ...item, data: [{ ...item.data[0], nasa_id, title, keywords }] });
  const json = body([
    mk("PIA22930", "Last Images Opportunity Took", ["Mars Exploration Rover (MER)", "Mars"]),
    mk("iss017e009734", "Earth Observations taken by the Expedition 17 Crew"),
    mk("as12-48-7121", "View of Surveyor III in its crater", ["LUNAR SURFACE"]),
    mk("AS12-48-7099", "Apollo 12 Mission image - View of the Surveyor III craft", ["Apollo", "Moon"]),
  ]);
  const mars = await relatedNasaImages("x", 4, undefined, { fetcher: okFetch(json), topic: "mars" });
  assert.deepEqual(mars.map((r) => r.nasaId), ["PIA22930"]);
  const moon = await relatedNasaImages("y", 4, "AS12-48-7121", { fetcher: okFetch(json), topic: "moon" });
  assert.deepEqual(moon.map((r) => r.nasaId), ["AS12-48-7099"]);
  for (const [id, e] of Object.entries(NASA_ARCHIVE)) assert.ok(e.topic === (id === "surveyor-3" || id === "apollo12-retrieval" ? "moon" : "mars"), id);
});
