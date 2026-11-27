# RR-418 Part D · renders every clip of jobs.json with the free Edge voices (edge-tts, no key, no account), line by line, then joins the
# lines with a short pause (ffmpeg from imageio-ffmpeg) into one mp3: 24 kHz, mono, 48 kbit/s. The text is exactly the job's line text:
# the audio never rewrites the script. Writes each clip to its file and scripts/factory/rr418/_work/rendered.json (bytes, duration).
#   python -I scripts/factory/rr418/render_audio.py scripts/factory/rr418/_work/jobs.json [--only KEY]
import asyncio, json, os, subprocess, sys, tempfile
import edge_tts, imageio_ffmpeg, av

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
PAUSE_S = 0.45
# no console window for ffmpeg on Windows (the owner's screen must not fill with windows)
NO_WINDOW = {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}

async def line_mp3(text, voice, pitch, out):
    kw = {"pitch": pitch} if pitch else {}
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, voice, **kw).save(out)
            if os.path.getsize(out) > 0:
                return
        except Exception as e:  # the free service sometimes drops a request: try again, then fail loudly
            err = e
        await asyncio.sleep(2 + attempt * 3)
    raise RuntimeError(f"edge-tts failed for voice {voice}: {err!r}")

def duration(path):
    with av.open(path) as c:
        return round(float(c.duration / 1_000_000), 2) if c.duration else 0.0

async def render(job, tmp):
    parts = []
    for i, l in enumerate(job["lines"]):
        f = os.path.join(tmp, f"{job['key']}-{i}.mp3")
        await line_mp3(l["text"], l["voice"], l["pitch"], f)
        parts.append(f)
    silence = os.path.join(tmp, "pause.mp3")  # the same codec as Edge's lines (24 kHz mono mp3), so the concat demuxer can join them
    if not os.path.exists(silence):
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", str(PAUSE_S), "-codec:a", "libmp3lame", "-b:a", "48k", silence], check=True, **NO_WINDOW)
    lst = os.path.join(tmp, f"{job['key']}.txt")
    with open(lst, "w", encoding="utf-8") as fh:
        for i, p in enumerate(parts):
            if i:
                fh.write(f"file '{silence}'\n")
            fh.write(f"file '{p}'\n")
    os.makedirs(os.path.dirname(job["file"]), exist_ok=True)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-ac", "1", "-ar", "24000", "-b:a", "48k", "-codec:a", "libmp3lame", job["file"]], check=True, **NO_WINDOW)
    return {"bytes": os.path.getsize(job["file"]), "durationSec": duration(job["file"]), "lines": len(parts)}

async def main():
    jobs_path = sys.argv[1]
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    jobs = json.load(open(jobs_path, encoding="utf-8"))
    out_path = os.path.join(os.path.dirname(jobs_path), "rendered.json")
    done = json.load(open(out_path, encoding="utf-8")) if os.path.exists(out_path) else {}
    with tempfile.TemporaryDirectory() as tmp:
        for j in jobs:
            if only and j["key"] != only:
                continue
            r = await render(j, tmp)
            done[j["key"]] = r
            print(f"  ok {j['key']}: {r['lines']} lines, {r['durationSec']} s, {r['bytes'] // 1024} KB", flush=True)
            json.dump(done, open(out_path, "w", encoding="utf-8"), indent=1)
    print(f"rendered {len(done)} clips; total {round(sum(x['durationSec'] for x in done.values()) / 60, 1)} min")

asyncio.run(main())
