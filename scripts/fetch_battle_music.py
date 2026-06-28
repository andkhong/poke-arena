#!/usr/bin/env python3
"""Download the Gen 1 (Red/Blue/Yellow) Pokemon soundtrack from a YouTube
playlist as MP3s in client/public/music/, then write a tracks.json manifest the
client reads to pick a random battle track.

Source playlist (override with --url):
  https://www.youtube.com/watch?v=EGPbpMXmb6Y&list=PL2uxd6YWj7PIOaewo5Z39hSJMdUmo3taO

Re-runnable: a download archive (client/public/music/.download-archive) lets
yt-dlp skip already-fetched tracks, and the manifest is rebuilt from whatever
.mp3 files are present.

Prereqs (from repo root):
  brew install yt-dlp        # ffmpeg is already required and present
  python3 scripts/fetch_battle_music.py

Note: these are copyrighted soundtrack assets for a personal fan project — keep
them out of any public distribution.
"""
import json
import os
import subprocess
import sys

PLAYLIST = (
    "https://www.youtube.com/watch?v=EGPbpMXmb6Y"
    "&list=PL2uxd6YWj7PIOaewo5Z39hSJMdUmo3taO"
)
OUT = "/Users/an/Desktop/poke-arena/client/public/music"
ARCHIVE = os.path.join(OUT, ".download-archive")
MANIFEST = os.path.join(OUT, "tracks.json")

os.makedirs(OUT, exist_ok=True)


def have(cmd):
    return subprocess.run(["command", "-v", cmd], capture_output=True, shell=False).returncode == 0


def write_manifest():
    tracks = sorted(f for f in os.listdir(OUT) if f.lower().endswith(".mp3"))
    with open(MANIFEST, "w") as f:
        json.dump(tracks, f, indent=2)
        f.write("\n")
    total = sum(os.path.getsize(os.path.join(OUT, t)) for t in tracks)
    print(f"      manifest: {len(tracks)} tracks, {total / 1e6:.1f} MB total")
    return tracks


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else PLAYLIST

    if subprocess.run(["which", "yt-dlp"], capture_output=True).returncode != 0:
        sys.exit("yt-dlp not found. Install it first:  brew install yt-dlp")
    if subprocess.run(["which", "ffmpeg"], capture_output=True).returncode != 0:
        sys.exit("ffmpeg not found. Install it first:  brew install ffmpeg")

    print(f"[1/2] Downloading playlist audio -> {OUT}", flush=True)
    cmd = [
        "yt-dlp",
        "--yes-playlist",
        "-x", "--audio-format", "mp3", "--audio-quality", "0",
        "--restrict-filenames",            # ASCII-safe names, no spaces (URL-safe)
        "--embed-metadata",
        "--download-archive", ARCHIVE,      # skip tracks already fetched on re-run
        "--ignore-errors",                  # keep going if one entry fails
        "-o", os.path.join(OUT, "%(playlist_index)02d-%(title)s.%(ext)s"),
        url,
    ]
    # Stream yt-dlp output directly so progress is visible.
    rc = subprocess.run(cmd).returncode
    if rc != 0:
        print(f"      yt-dlp exited {rc} (some entries may have been skipped)", flush=True)

    print("[2/2] Writing manifest ...", flush=True)
    tracks = write_manifest()
    if not tracks:
        sys.exit("No .mp3 files were downloaded — check the playlist URL / yt-dlp output.")
    print(f"DONE: {len(tracks)} tracks in {OUT}", flush=True)


if __name__ == "__main__":
    main()
