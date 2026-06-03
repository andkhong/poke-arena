#!/usr/bin/env python3
"""Download per-move Pokemon SFX from KHInsider (Gen 3 attack-moves album),
match them to canonical PokeAPI move slugs, and convert to compact MP3s in
client/public/movesfx/moves/<slug>.mp3.

Source: KHInsider "Pokemon SFX Gen 3 - Attack Moves (RSE/FR/LG)" — real ripped
game SFX; ~336 tracks match PokeAPI move slugs. Saved-slug list is written to
/tmp/move_sfx_slugs.txt.

Full asset pipeline (run from repo root):
  1. python3 scripts/fetch_move_sfx.py        # download + convert per-move SFX
  2. # per-type fallbacks: copy one representative move per type ->
     #   client/public/movesfx/<type>.mp3  (+ status.mp3)
  3. # regenerate the seed bridge from the assets dir:
     #   ls client/public/movesfx/moves | sed 's/\\.mp3$//'  ->  server/src/seed/moveSfx.ts
     #   (export const MOVES_WITH_SFX = new Set<string>([...]))
  4. npx tsx server/src/seed/backfillSfx.ts    # mirror MOVES_WITH_SFX into Move.sfx
"""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ALBUM = "https://downloads.khinsider.com/game-soundtracks/album/pokemon-sfx-gen-3-attack-moves-rse-fr-lg"
OUT = "/Users/an/Desktop/poke-arena/client/public/movesfx/moves"
TMP = "/tmp/movesfx_raw"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)


def get(url, binary=False, tries=4):
    # Shell out to curl: the bundled python lacks a CA bundle, but curl works.
    for i in range(tries):
        r = subprocess.run(
            ["curl", "-sL", "--compressed", "--max-time", "60", "-A", UA, url],
            capture_output=True,
        )
        if r.returncode == 0 and r.stdout:
            return r.stdout if binary else r.stdout.decode("utf-8", "replace")
        time.sleep(0.6 * (i + 1))
    raise RuntimeError(f"curl failed for {url}: rc={r.returncode}")


def slugify(name):
    """KHInsider track name -> candidate PokeAPI move slug."""
    s = name
    s = re.sub(r"\s*\(?\bpart\s*\d+\)?", "", s, flags=re.I)  # drop 'part N'
    s = re.sub(r"\s*\(.*?\)", "", s)                          # drop parentheticals
    s = s.strip().lower()
    s = s.replace("é", "e").replace("♀", "-f").replace("♂", "-m")
    s = re.sub(r"[ _]+", "-", s)
    s = re.sub(r"[^a-z0-9-]", "", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


print("[1/5] Fetching canonical PokeAPI move slugs ...", flush=True)
moves_json = json.loads(get("https://pokeapi.co/api/v2/move?limit=2000"))
valid = {m["name"] for m in moves_json["results"]}
print(f"      {len(valid)} valid move slugs", flush=True)

print("[2/5] Parsing KHInsider album track list ...", flush=True)
html = get(ALBUM)
hrefs = sorted(set(re.findall(
    r'(/game-soundtracks/album/pokemon-sfx-gen-3-attack-moves-rse-fr-lg/[^"]+\.mp3)', html)))
print(f"      {len(hrefs)} track links", flush=True)

# Map slug -> chosen track href (prefer base track over 'part N').
chosen = {}
for href in hrefs:
    fn = href.rsplit("/", 1)[1][:-4]                 # strip .mp3
    name = urllib.parse.unquote(urllib.parse.unquote(fn))  # double-decode
    slug = slugify(name)
    if slug not in valid:
        continue
    is_part = bool(re.search(r"\bpart\s*\d+", name, re.I))
    if slug not in chosen:
        chosen[slug] = (href, is_part, name)
    else:
        # prefer a non-part track
        if chosen[slug][1] and not is_part:
            chosen[slug] = (href, is_part, name)
print(f"[3/5] {len(chosen)} tracks matched to real move slugs", flush=True)


def process(slug, href, name):
    page = get("https://downloads.khinsider.com" + href)
    m = re.findall(r'https?://[^"\']+\.mp3', page)
    direct = next((u for u in m if "vgmtreasurechest" in u or "/soundtracks/" in u), None)
    if not direct:
        return slug, False, "no-direct-url"
    raw = get(direct, binary=True)
    rawpath = os.path.join(TMP, slug + ".mp3")
    with open(rawpath, "wb") as f:
        f.write(raw)
    outpath = os.path.join(OUT, slug + ".mp3")
    r = subprocess.run([
        "ffmpeg", "-y", "-i", rawpath,
        "-map", "0:a:0",            # drop the source's embedded cover-art image
        "-af", "loudnorm=I=-18:TP=-2:LRA=11",
        "-ac", "1", "-ar", "44100", "-b:a", "64k", "-t", "6",
        outpath,
    ], capture_output=True)
    if r.returncode != 0:
        return slug, False, "ffmpeg-fail"
    return slug, True, str(os.path.getsize(outpath))


print("[4/5] Downloading + converting ...", flush=True)
ok, fail = [], []
items = [(s, h, n) for s, (h, _p, n) in chosen.items()]
with ThreadPoolExecutor(max_workers=6) as ex:
    futs = {ex.submit(process, s, h, n): s for s, h, n in items}
    done = 0
    for fut in as_completed(futs):
        slug = futs[fut]
        try:
            s, success, info = fut.result()
        except Exception as e:
            success, info = False, str(e)[:40]
        done += 1
        if success:
            ok.append(slug)
        else:
            fail.append((slug, info))
        if done % 25 == 0:
            print(f"      {done}/{len(items)} (ok={len(ok)} fail={len(fail)})", flush=True)

ok.sort()
with open("/tmp/move_sfx_slugs.txt", "w") as f:
    f.write("\n".join(ok))
print(f"[5/5] DONE: {len(ok)} saved, {len(fail)} failed", flush=True)
if fail:
    print("      failures:", fail[:20], flush=True)
print("      slugs written to /tmp/move_sfx_slugs.txt", flush=True)
