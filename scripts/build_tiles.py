"""
Build static Web-Mercator XYZ tiles for the Moon and Mars from NASA Trek
equirectangular (EQ) WMTS mosaics. Run once; output is committed to public/tiles.

Sources (public domain, NASA/JPL-Caltech/GSFC/ASU/USGS):
  Moon: LRO WAC Global Mosaic 303ppd v02            (trek.nasa.gov)
  Mars: Viking MDIM 2.1 Colorized Global Mosaic 232m (trek.nasa.gov)
"""
import io, math, os, sys, urllib.request
from PIL import Image

LAYERS = {
    "moon": "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{r}/{c}.jpg",
    "mars": "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{r}/{c}.jpg",
}
EQ_ZOOM = 3          # Trek EQ z3 -> 16 x 8 tiles of 256px = 4096 x 2048
MAX_Z = 4            # mercator output z0..z4
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "tiles")


def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")


def stitch(body):
    cols, rows = 2 ** (EQ_ZOOM + 1), 2 ** EQ_ZOOM
    canvas = Image.new("RGB", (cols * 256, rows * 256))
    for r in range(rows):
        for c in range(cols):
            canvas.paste(fetch(LAYERS[body].format(z=EQ_ZOOM, r=r, c=c)), (c * 256, r * 256))
        print(f"  {body}: row {r + 1}/{rows}", flush=True)
    return canvas


def to_mercator(eq, size):
    """Resample an equirectangular image into a square Web-Mercator image."""
    w, h = eq.size
    src = eq.load()
    out = Image.new("RGB", (size, size))
    px = out.load()
    for y in range(size):
        lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 0.5) / size))))
        sy = min(h - 1, max(0, int((90 - lat) / 180 * h)))
        for x in range(size):
            sx = min(w - 1, int((x + 0.5) / size * w))
            px[x, y] = src[sx, sy]
    return out


def main():
    for body in sys.argv[1:] or LAYERS:
        print(f"stitching {body}")
        eq = stitch(body)
        eq.resize((2048, 1024), Image.LANCZOS).save(os.path.join(OUT, f"{body}-eq.jpg"), quality=84)
        merc = to_mercator(eq, 256 * 2 ** MAX_Z)
        for z in range(MAX_Z + 1):
            n = 2 ** z
            level = merc.resize((256 * n, 256 * n), Image.LANCZOS) if z < MAX_Z else merc
            for x in range(n):
                for y in range(n):
                    d = os.path.join(OUT, body, str(z), str(x))
                    os.makedirs(d, exist_ok=True)
                    level.crop((x * 256, y * 256, x * 256 + 256, y * 256 + 256)).save(
                        os.path.join(d, f"{y}.jpg"), quality=82)
        print(f"  {body}: tiles z0-z{MAX_Z} written")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    main()
