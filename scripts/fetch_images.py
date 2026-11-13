"""
Download curated NASA Image and Video Library assets into public/images/nasa
and record their official metadata in scripts/image-manifest.json.
NASA imagery is generally not subject to copyright in the United States;
see https://www.nasa.gov/nasa-brand-center/images-and-media/
"""
import io, json, os, time, urllib.request
from PIL import Image

IDS = ["as08-14-2383", "art002e021278", "GSFC_20171208_Archive_e001861",
       "as11-37-5551", "PIA12909", "AS12-48-7133", "as12-48-7121", "as14-67-09361",
       "PIA13037", "as16-113-18347", "as17-147-22548", "PIA12910", "PIA00381",
       "PIA03165", "PIA04023", "PIA04318", "PIA03250", "PIA22909", "PIA23178",
       "PIA10701", "PIA25287", "PIA23177", "PIA19807", "PIA24542", "PIA26236", "PIA26482",
       "as11-40-5948", "PIA26635", "PIA24263", "PIA16208", "PIA24482",
       "GSFC_20171208_Archive_e000678"]
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "public", "images", "nasa")
API = "https://images-api.nasa.gov"


def fetch(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return r.read()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(3 * (i + 1))


def get_json(url):
    return json.loads(fetch(url))


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for nid in IDS:
        meta = get_json(f"{API}/search?nasa_id={nid}")["collection"]["items"][0]["data"][0]
        hrefs = [h["href"] for h in get_json(f"{API}/asset/{nid}")["collection"]["items"]]
        src = next((h for h in hrefs if "~large" in h), None) or next(h for h in hrefs if "~orig" in h)
        slug = nid.lower()
        full_path = os.path.join(OUT, f"{slug}.jpg")
        if os.path.exists(full_path):  # keep hand-upscaled versions (hero, panoramas)
            full = Image.open(full_path)
        else:
            img = Image.open(io.BytesIO(fetch(src.replace("http://", "https://")))).convert("RGB")
            full = img.copy(); full.thumbnail((2000, 2000), Image.LANCZOS)
            full.save(full_path, quality=82, optimize=True, progressive=True)
            thumb = img.copy(); thumb.thumbnail((640, 640), Image.LANCZOS)
            thumb.save(os.path.join(OUT, f"{slug}-thumb.jpg"), quality=78, optimize=True)
        manifest[nid] = {
            "file": f"/images/nasa/{slug}.jpg", "thumb": f"/images/nasa/{slug}-thumb.jpg",
            "width": full.width, "height": full.height,
            "title": meta.get("title"), "date": meta.get("date_created", "")[:10],
            "center": meta.get("center"), "photographer": meta.get("photographer"),
            "description": meta.get("description"),
            "page": f"https://images.nasa.gov/details/{nid}",
        }
        print("ok", nid, full.size, flush=True)
    with open(os.path.join(ROOT, "scripts", "image-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
