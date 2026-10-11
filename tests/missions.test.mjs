import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTERS, CHAPTER_BY_ID } from "../src/missions/content/chapters.ts";
import { buildArena, eligible, shortName } from "../src/missions/content/arena.ts";
import { arcDegrees, distanceKm, starsFor, formatDate, formatLatLon, siteName, toMap, fromMap, daysBetween } from "../src/missions/core/geo.ts";
import { mulberry32, shuffle } from "../src/missions/core/rng.ts";
import {
  newProgress, sanitize, recordClip, recordCompass, recordQuiz, recordArena, chapterDone, hasBadge, xpOf, levelOf, chapterXp,
} from "../src/missions/core/progress.ts";

const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const byId = new Map(catalog.objects.map((o) => [o.id, o]));
const bilingual = (l) => typeof l?.en === "string" && l.en.trim() && typeof l?.bn === "string" && l.bn.trim();

test("catalog: ids unique, ranges valid, every object has a source", () => {
  assert.ok(catalog.objects.length >= 90);
  assert.equal(new Set(catalog.objects.map((o) => o.id)).size, catalog.objects.length);
  for (const o of catalog.objects) {
    assert.ok(["moon", "mars"].includes(o.body), o.id);
    if (o.lat != null) {
      assert.ok(o.lat >= -90 && o.lat <= 90 && o.lon >= -180 && o.lon <= 180, o.id);
    }
    assert.ok(o.source_url?.startsWith("https://"), `${o.id} needs a source`);
    assert.match(o.left_behind ?? "", /^\d{4}(-\d{2}-\d{2})?$/, o.id);
    if (o.last_contact) assert.match(o.last_contact, /^\d{4}-\d{2}-\d{2}$/, o.id);
  }
});

test("chapters: ten, bilingual, each linked to a located catalog object with a source", () => {
  assert.equal(CHAPTERS.length, 10);
  assert.equal(CHAPTER_BY_ID.size, 10);
  const orders = CHAPTERS.map((c) => c.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  for (const c of CHAPTERS) {
    const o = byId.get(c.objectId);
    assert.ok(o, `${c.id}: unknown object ${c.objectId}`);
    assert.equal(o.body, c.body, c.id);
    assert.ok(o.lat != null && o.lon != null, `${c.id} must be located for the compass`);
    assert.ok(o.source_url, c.id);
    for (const f of [c.title, c.dek, c.why, c.science, c.hint1, c.hint2, c.badge.name]) assert.ok(bilingual(f), `${c.id} text`);
    assert.equal(c.beats.map((b) => b.id).join(), "arrive,work,silence,echo", c.id);
    for (const b of c.beats) assert.ok(bilingual(b.caption) && b.seconds >= 4, `${c.id}.${b.id}`);
    assert.equal(c.quiz.length, 3, c.id);
    for (const q of c.quiz) {
      assert.ok(bilingual(q.prompt) && bilingual(q.explain), q.id);
      assert.equal(q.options.length, 4, q.id);
      q.options.forEach((opt) => assert.ok(bilingual(opt), q.id));
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.id);
      assert.equal(new Set(q.options.map((x) => x.en)).size, 4, `${q.id} options must differ`);
    }
  }
  const ids = CHAPTERS.flatMap((c) => c.quiz.map((q) => q.id));
  assert.equal(new Set(ids).size, ids.length, "question ids unique");
  assert.equal(new Set(CHAPTERS.map((c) => c.badge.id)).size, CHAPTERS.length, "badges unique");
});

test("chapter quiz explanations agree with the catalog", () => {
  const get = (id) => byId.get(id);
  assert.equal(get("viking-1").left_behind.slice(0, 4), "1976");
  assert.equal(get("surveyor-3").left_behind, "1967-04-20");
  assert.equal(get("surveyor-3").last_contact, "1967-05-03");
  assert.equal(get("apollo-17").left_behind, "1972-12-11");
  assert.equal(get("apollo-17").last_contact, "1977-09-30");
  assert.equal(get("im-1-odysseus").left_behind, "2024-02-22");
  assert.equal(get("im-1-odysseus").last_contact, "2024-02-29");
  assert.equal(get("opportunity").last_contact, "2018-06-10");
  assert.equal(get("insight").last_contact, "2022-12-15");
  assert.equal(get("phoenix").last_contact, "2008-11-02");
  assert.equal(get("pathfinder").last_contact, "1997-09-27");
  assert.equal(get("ingenuity").last_contact, "2024-04-16");
  // coordinates quoted in hints
  const near = (id, lat, lon, tol = 1.2) => {
    const o = get(id);
    assert.ok(Math.abs(o.lat - lat) <= tol && Math.abs(o.lon - lon) <= tol, `${id} ${o.lat},${o.lon}`);
  };
  near("apollo-11", 0.67, 23.47); near("surveyor-3", -3, -23.4); near("apollo-17", 20.2, 30.8, 1.5);
  near("im-1-odysseus", -80.1, 1.4); near("viking-1", 22.5, -50, 1.2); near("pathfinder", 19.3, -33.5);
  near("opportunity", -1.95, -5.5); near("phoenix", 68.2, -125.7); near("insight", 4.5, 135.6); near("ingenuity", 18.4, 77.4);
  // Opportunity: "45 km" in the quiz should match the spreadsheet note.
  assert.match(get("opportunity").note_bn, /45\.16/);
  // marathon fact: 45.16 km > 42.2 km
  assert.ok(45.16 > 42.195);
  // Sojourner: ~100 m is in the spreadsheet note
  assert.match(get("sojourner").note_bn, /100/);
  assert.match(get("ingenuity").note_bn, /72/);
});

test("geo: arc, stars, formatting, map projection", () => {
  assert.ok(Math.abs(arcDegrees(0, 0, 0, 90) - 90) < 1e-9);
  assert.ok(Math.abs(arcDegrees(10, 20, 10, 20)) < 1e-9);
  assert.ok(Math.abs(arcDegrees(90, 0, -90, 0) - 180) < 1e-9);
  // across the antimeridian is short
  assert.ok(arcDegrees(0, 179, 0, -179) < 2.01);
  assert.ok(Math.abs(distanceKm("moon", 0, 0, 0, 90) - (Math.PI / 2) * 1737.4) < 0.01);
  assert.equal(starsFor(3), 3); assert.equal(starsFor(8), 3); assert.equal(starsFor(8.1), 2);
  assert.equal(starsFor(20), 2); assert.equal(starsFor(30), 1); assert.equal(starsFor(45.1), 0);
  assert.equal(formatDate("1969-07-20", "en"), "20 Jul 1969");
  assert.equal(formatDate("1969-07-20", "bn"), "২০ জুলাই ১৯৬৯");
  assert.equal(formatDate(null, "en"), "unknown");
  assert.equal(formatDate("1972", "en"), "1972");
  assert.equal(formatLatLon(-3.01, -23.42, "en"), "3.01°S, 23.42°W");
  assert.match(formatLatLon(0.67, 23.47, "bn"), /উ/);
  assert.equal(daysBetween("1967-04-20", "1967-05-03"), 13);
  const p = toMap(45, -90); assert.ok(Math.abs(p.x - 0.25) < 1e-9 && Math.abs(p.y - 0.25) < 1e-9);
  const b = fromMap(0.25, 0.25); assert.ok(Math.abs(b.lat - 45) < 1e-9 && Math.abs(b.lon + 90) < 1e-9);
});

test("geo: site names are read from the spreadsheet text", () => {
  assert.equal(siteName(byId.get("lunokhod-1")), "Mare Imbrium");
  assert.equal(siteName(byId.get("viking-1")), "Chryse Planitia");
  assert.equal(siteName(byId.get("chang-e-4")), "Von Kármán crater");
  assert.equal(siteName(byId.get("luna-2")), null);
});

test("arena: deterministic, valid, varied, and every answer is consistent with the catalog", () => {
  const a = buildArena(catalog, 12345, 10);
  const b = buildArena(catalog, 12345, 10);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map((q) => q.id), buildArena(catalog, 54321, 10).map((q) => q.id));
  for (const seed of [1, 2, 3, 99, 2026, 777777]) {
    const qs = buildArena(catalog, seed, 10);
    assert.equal(qs.length, 10, `seed ${seed}`);
    assert.equal(new Set(qs.map((q) => q.id)).size, 10, `seed ${seed} ids unique`);
    for (const q of qs) {
      assert.ok(bilingual(q.prompt) && bilingual(q.explain), q.id);
      assert.ok(q.options.length >= 2 && q.options.length <= 4, q.id);
      assert.equal(new Set(q.options.map((o) => o.en)).size, q.options.length, `${q.id} distinct options`);
      assert.ok(q.answer >= 0 && q.answer < q.options.length, q.id);
      q.options.forEach((o) => assert.ok(bilingual(o), q.id));
      const o = q.objectId && byId.get(q.objectId);
      if (q.kind === "year") assert.equal(q.options[q.answer].en, o.left_behind.slice(0, 4));
      if (q.kind === "hemisphere") assert.equal(q.options[q.answer].en.startsWith("North"), o.lat > 0);
      if (q.kind === "site") assert.equal(q.options[q.answer].en, siteName(o));
      if (q.kind === "agency") assert.ok(q.options[q.answer].en.length > 0);
    }
  }
  assert.ok(catalog.objects.filter(eligible).length >= 40);
});

test("arena: 'first' answers really are the earliest", () => {
  let seen = 0;
  for (let seed = 1; seed < 80 && seen < 5; seed++) {
    for (const q of buildArena(catalog, seed, 10)) {
      if (q.kind !== "first") continue;
      seen++;
      const dates = q.options.map((o) => catalog.objects.find((c) => shortName(c) === o.en)?.left_behind);
      assert.ok(dates.every(Boolean));
      assert.equal(dates[q.answer], [...dates].sort()[0]);
    }
  }
  assert.ok(seen >= 3);
});

test("rng: shuffle keeps items, seeded", () => {
  const r = mulberry32(7);
  const out = shuffle([1, 2, 3, 4, 5, 6], r);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(shuffle([1, 2, 3, 4, 5, 6], mulberry32(7)), out);
});

test("progress: records are monotonic, idempotent and derive XP", () => {
  let p = newProgress();
  assert.equal(xpOf(p), 0);
  p = recordClip(p, "apollo-11");
  p = recordCompass(p, "apollo-11", 3, 0);
  p = recordQuiz(p, "apollo-11", 3);
  const xp1 = xpOf(p);
  assert.equal(xp1, 10 + 60 + 45 + 25);
  assert.ok(chapterDone(p.chapters["apollo-11"]) && hasBadge(p.chapters["apollo-11"]));
  // replaying with worse results never lowers anything and never double counts
  p = recordCompass(recordQuiz(recordClip(p, "apollo-11"), "apollo-11", 1), "apollo-11", 1, 0);
  assert.equal(xpOf(p), xp1);
  // hints cost XP, but never below zero
  const h = recordCompass(newProgress(), "viking-1", 0, 2);
  assert.ok(chapterXp(h.chapters["viking-1"]) <= 0 || xpOf(h) === 0);
  // unknown chapters are ignored
  assert.deepEqual(recordClip(newProgress(), "nope"), newProgress());
  // arena
  p = recordArena(p, 800, 6, "2026-10-15");
  p = recordArena(p, 300, 2, "2026-10-15");
  assert.equal(p.arena.best, 800); assert.equal(p.arena.plays, 2); assert.equal(p.arena.daily["2026-10-15"], 800);
});

test("progress: levels and corrupt saves", () => {
  assert.equal(levelOf(0).index, 0);
  assert.equal(levelOf(100).index, 1);
  assert.equal(levelOf(99999).index, 4);
  assert.equal(levelOf(99999).next, null);
  const dirty = sanitize({
    v: 99,
    chapters: { "apollo-11": { clip: "yes", stars: 99, hints: -4, quiz: 2.6 }, "not-real": { clip: true }, "viking-1": null },
    arena: { plays: "x", best: 1e12, bestStreak: -3, daily: { "2026-01-01": 5, bad: 9 } },
    vrVisited: 1,
  });
  assert.equal(dirty.chapters["apollo-11"].clip, false);
  assert.equal(dirty.chapters["apollo-11"].stars, 3);
  assert.equal(dirty.chapters["apollo-11"].hints, 0);
  assert.equal(dirty.chapters["apollo-11"].quiz, 3);
  assert.ok(!("not-real" in dirty.chapters) && !("viking-1" in dirty.chapters));
  assert.equal(dirty.arena.plays, 0); assert.equal(dirty.arena.best, 100000); assert.equal(dirty.arena.bestStreak, 0);
  assert.deepEqual(Object.keys(dirty.arena.daily), ["2026-01-01"]);
  assert.equal(dirty.vrVisited, false);
  assert.deepEqual(sanitize(null), newProgress());
  assert.deepEqual(sanitize("junk"), newProgress());
});

test("photos: every mapping points to a real catalog object and a bundled, credited image", async () => {
  const { PHOTOS } = await import("../src/missions/content/photos.ts");
  const sources = JSON.parse(readFileSync(new URL("../public/data/sources.json", import.meta.url), "utf8"));
  const { existsSync } = await import("node:fs");
  for (const [id, keys] of Object.entries(PHOTOS)) {
    assert.ok(byId.has(id), `unknown object ${id}`);
    for (const k of keys) {
      const img = sources.images[k];
      assert.ok(img, `${id}: no image ${k}`);
      assert.ok(img.credit && img.title && img.page, `${k} needs credit, title and page`);
      assert.ok(existsSync(new URL(`../public${img.file}`, import.meta.url)), `${k} file missing`);
      assert.ok(existsSync(new URL(`../public${img.thumb}`, import.meta.url)), `${k} thumb missing`);
    }
  }
  for (const c of CHAPTERS) if (c.objectId !== "im-1-odysseus") assert.ok(PHOTOS[c.objectId]?.length, `chapter ${c.id} has no photo`);
});
