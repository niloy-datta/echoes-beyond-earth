#!/usr/bin/env python3
"""Build public/data/catalog.json from the two curated spreadsheets in data-sources/.

    python3 scripts/build-catalog.py

The spreadsheets (moon_surface_objects.xlsx, mars_surface_objects.xlsx) are the human-edited source of truth:
every row has name, mission, coordinates, date left behind, last contact, image link and source link.
This script only *normalises* them (decimal coordinates, ISO dates, stable ids, agency) — it never adds facts.
Anything it cannot parse is kept as raw text and the machine-readable field is left null.
"""
import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-sources"
OUT = ROOT / "public" / "data" / "catalog.json"

BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

# ── stable ids (first words of the English name are enough for everything else) ──────────────────────────
ID_OVERRIDES = {
    "Apollo 11 – Eagle": "apollo-11",
    "Apollo 12 – Intrepid": "apollo-12",
    "Apollo 14 – Antares": "apollo-14",
    "Apollo 15 – Falcon": "apollo-15",
    "Apollo 16 – Orion": "apollo-16",
    "Apollo 17 – Challenger": "apollo-17",
    "Lunar Roving Vehicle": "lrv-1-2-3",
    "Luna 17 ল্যান্ডার": "lunokhod-1",
    "Luna 21 ল্যান্ডার": "lunokhod-2",
    "Odysseus (Nova-C)": "im-1-odysseus",
    "Athena (Nova-C)": "im-2-athena",
    "Blue Ghost M1": "blue-ghost-1",
    "Vikram ল্যান্ডার|Chandrayaan-3": "chandrayaan-3-vikram",
    "Vikram ল্যান্ডার|Chandrayaan-2": "chandrayaan-2-vikram",
    "Pragyan রোভার": "pragyan",
    "Yutu রোভার": "yutu",
    "Yutu-2 রোভার": "yutu-2",
    "Resilience ল্যান্ডার": "hakuto-r-2-resilience",
    "Hakuto-R M1": "hakuto-r-1",
    "Viking 1 lander": "viking-1",
    "Viking 2 lander": "viking-2",
    "Mars Pathfinder lander": "pathfinder",
    "Sojourner rover": "sojourner",
    "Opportunity rover": "opportunity",
    "Spirit rover": "spirit",
    "Phoenix lander": "phoenix",
    "Curiosity rover": "curiosity",
    "InSight lander": "insight",
    "Perseverance rover": "perseverance",
    "Ingenuity helicopter": "ingenuity",
    "Mars Polar Lander": "mars-polar-lander",
    "Deep Space 2": "deep-space-2",
    "Surveyor 3": "surveyor-3",
    "Surveyor 1": "surveyor-1",
    "LEV-1 ও LEV-2": "slim-lev",
    "SLIM ল্যান্ডার": "slim",
    "Moon Impact Probe": "moon-impact-probe",
    "Okina (Rstar)": "okina",
    "Kaguya (SELENE": "kaguya",
    "LCROSS Centaur": "lcross",
    "GRAIL (Ebb": "grail",
    "Apollo 13 S-IVB": "apollo-13-s-ivb",
    "Falcon 9 উপরের": "falcon-9-stage-2026",
}
# Objects with no coordinates of their own sit beside a parent object.
NEAR_PARENT = {
    "lrv-1-2-3": "apollo-17",
    "yutu": "chang-e-3",
    "yutu-2": "chang-e-4",
    "pragyan": "chandrayaan-3-vikram",
    "slim-lev": "slim",
    "deep-space-2": "mars-polar-lander",
}
# Objects that are in the spreadsheets but whose museum (objects.geojson) id differs.
MUSEUM_ID = {
    "apollo-11": "apollo-11", "apollo-12": "apollo-12", "apollo-14": "apollo-14", "apollo-15": "apollo-15",
    "apollo-16": "apollo-16", "apollo-17": "apollo-17", "surveyor-1": "surveyor-1", "surveyor-3": "surveyor-3",
    "ranger-7": "ranger-7", "im-1-odysseus": "im-1", "blue-ghost-1": "blue-ghost-1", "lcross": "lcross", "grail": "grail",
    "viking-1": "viking-1", "viking-2": "viking-2", "pathfinder": "pathfinder", "sojourner": "pathfinder",
    "mars-polar-lander": "mars-polar-lander", "spirit": "spirit", "opportunity": "opportunity", "phoenix": "phoenix",
    "curiosity": "curiosity", "insight": "insight", "perseverance": "perseverance", "ingenuity": "ingenuity",
}
ACTIVE = {"curiosity", "perseverance", "chang-e-4", "yutu-2"}
LOST = {"mars-polar-lander", "deep-space-2"}  # position not confirmed
# Parsed dates that would mislead: Beagle 2 never made contact (the date is its separation from Mars Express) and
# Vikram (Chandrayaan-3) was last heard before its sleep; the 22 Sep date is only a failed wake-up attempt.
LAST_NONE = {"beagle-2", "chandrayaan-3-vikram"}
CRASHED_MARS = {"mars-2-lander", "mars-6-lander", "mars-polar-lander", "deep-space-2", "schiaparelli-edm-lander"}
APOLLO = {"apollo-11", "apollo-12", "apollo-14", "apollo-15", "apollo-16", "apollo-17"}
COORD_OVERRIDES = {  # unparseable or ambiguous strings, set by hand (lat, lon east-positive) with the reason
    "mars-2-lander": (-45.0, 47.0, "text gives 45°S, 313°W (≈47°E)"),
    "luna-5": (-31.0, -8.0, "two lists disagree: 31°S 8°W vs 8°N 23°W; first used"),
}


def ascii_name(name: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\x00-\x7F–]", " ", name)).strip(" -–()+,")


def slug(s: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")


def make_id(name: str, mission: str) -> str:
    for key, val in ID_OVERRIDES.items():
        k, _, m = key.partition("|")
        if name.startswith(k) and (not m or m in mission):
            return val
    words = ascii_name(name).split(" ")
    return slug(" ".join(words[:3]))


def agency_of(mission: str) -> str:
    m = mission
    for key, val in (
        ("USSR", "USSR"), ("USA", "USA"), ("NASA", "USA"), ("চীন", "China"), ("CNSA", "China"), ("ভারত", "India"),
        ("জাপান", "Japan"), ("ESA", "ESA"), ("রাশিয়া", "Russia"), ("ইসরায়েল", "Israel"),
    ):
        if key in m:
            return val
    return "Other"


def parse_coord(s: str):
    s = s.replace("আনুমানিক", "").replace("প্রায়", "").strip()
    m = re.search(r"(\d+)°\s*(\d+)′\s*(?:(\d+(?:\.\d+)?)″)?\s*([NS])[ ,]+(\d+)°\s*(\d+)′\s*(?:(\d+(?:\.\d+)?)″)?\s*([EW])", s)
    if m:
        la = int(m[1]) + int(m[2]) / 60 + float(m[3] or 0) / 3600
        lo = int(m[5]) + int(m[6]) / 60 + float(m[7] or 0) / 3600
        return (-la if m[4] == "S" else la, -lo if m[8] == "W" else lo)
    m = re.search(r"(\d+(?:\.\d+)?)°\s*([NS])[ ,]+(\d+(?:\.\d+)?)°\s*([EW])?", s)
    if m:
        la, lo = float(m[1]), float(m[3])
        return (-la if m[2] == "S" else la, -lo if m[4] == "W" else lo)
    return None


def wrap(lon: float) -> float:
    while lon > 180:
        lon -= 360
    while lon < -180:
        lon += 360
    return lon


DATE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")


def dates_in(s: str):
    s = s.translate(BN_DIGITS)
    return [m.group(0) for m in DATE.finditer(s)]


def year_in(s: str):
    m = re.search(r"\b(1[89]\d\d|20\d\d)\b", s.translate(BN_DIGITS))
    return m.group(1) if m else None


def main() -> int:
    rows = []
    for body, fname in (("moon", "moon_surface_objects.xlsx"), ("mars", "mars_surface_objects.xlsx")):
        wb = load_workbook(SRC / fname)
        for ws in wb.worksheets:
            if ws.title == "নোট":
                continue
            sheet_kind = {"Moon soft-landed": "landed", "Moon crashed landers": "crashed", "Impacts & stages": "impact"}.get(ws.title, "landed")
            for r in ws.iter_rows(min_row=2, values_only=True):
                name, mission, coords, left, last, img, srcs, note = (str(x) if x is not None else "" for x in r[:8])
                oid = make_id(name, mission)
                rows.append(dict(body=body, sheet_kind=sheet_kind, name=name, mission=mission, coords=coords, left=left, last=last,
                                 img=img, srcs=srcs, note=note, id=oid))

    # unique ids (the Moon has two "Vikram" rows etc.; the override table separates them, anything left gets a suffix)
    seen = {}
    for r in rows:
        n = seen.get(r["id"], 0)
        seen[r["id"]] = n + 1
        if n:
            r["id"] = f'{r["id"]}-{n + 1}'

    by_id = {r["id"]: r for r in rows}
    objects = []
    warnings = []
    for r in rows:
        oid = r["id"]
        parsed = None
        precision = "approx" if "আনুমানিক" in r["coords"] or "approx" in r["coords"].lower() else "reported"
        note_coord = None
        if oid in COORD_OVERRIDES:
            la, lo, note_coord = COORD_OVERRIDES[oid]
            parsed = (la, lo)
            precision = "approx"
        else:
            parsed = parse_coord(r["coords"])
        lat = lon = None
        if parsed:
            lat, lon = round(parsed[0], 5), round(wrap(parsed[1]), 5)
        elif oid in NEAR_PARENT:
            parent = by_id.get(NEAR_PARENT[oid])
            pp = parent and (parse_coord(parent["coords"]))
            if pp:
                lat, lon = round(pp[0], 5), round(wrap(pp[1]), 5)
                precision = "near-parent"
        if lat is None:
            warnings.append(f"no coordinates: {oid}")

        left_dates = dates_in(r["left"])
        left_iso = left_dates[0] if left_dates else year_in(r["left"])
        last_dates = dates_in(r["last"])
        last_iso = None
        last_approx = False
        if oid in LAST_NONE:
            last_dates = []
        if last_dates:
            last_iso = last_dates[-1] if oid in APOLLO else last_dates[0]
            last_approx = ("অযাচাইকৃত" in r["last"]) or ("≈" in r["last"])
        elif oid not in ACTIVE and oid not in LAST_NONE:
            if any(k in r["last"] for k in ("ইমপ্যাক্ট", "অযাচাইকৃত", "অবতরণকালেই", "অবতরণের")) and left_iso and len(left_iso) == 10:
                last_iso, last_approx = left_iso, True
        sources = [u.strip() for u in r["srcs"].split("\n") if u.strip().startswith("http")]
        if not sources:
            warnings.append(f"no source: {oid}")
        image_url = r["img"] if r["img"].startswith("http") else None

        if r["sheet_kind"] == "landed" and oid in CRASHED_MARS:
            kind = "crashed"
        else:
            kind = r["sheet_kind"]
        status = "active" if oid in ACTIVE else ("lost" if oid in LOST else "silent")
        objects.append(dict(
            id=oid, body=r["body"], kind=kind, status=status, name=r["name"], mission=r["mission"],
            agency=agency_of(r["mission"]),
            lat=lat, lon=lon, precision=precision, coords_raw=r["coords"].replace("\n", " "),
            coords_note=note_coord,
            left_behind=left_iso, left_raw=r["left"].replace("\n", " "),
            last_contact=last_iso, last_contact_approx=last_approx, last_raw=r["last"].replace("\n", " "),
            image_url=image_url, source_url=sources[0] if sources else None, sources=sources,
            note_bn=r["note"] or None, museum_id=MUSEUM_ID.get(oid),
        ))

    # validation
    ids = [o["id"] for o in objects]
    assert len(ids) == len(set(ids)), "duplicate ids"
    for o in objects:
        if o["lat"] is not None:
            assert -90 <= o["lat"] <= 90 and -180 <= o["lon"] <= 180, o["id"]
    OUT.write_text(json.dumps(dict(
        generated_from=["data-sources/moon_surface_objects.xlsx", "data-sources/mars_surface_objects.xlsx"],
        note="Normalised by scripts/build-catalog.py. Facts live in the spreadsheets; this file only parses them.",
        objects=objects), ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(objects)} objects "
          f"({sum(o['body']=='moon' for o in objects)} moon, {sum(o['body']=='mars' for o in objects)} mars)")
    for w in warnings:
        print("warning:", w)
    return 0


if __name__ == "__main__":
    sys.exit(main())
