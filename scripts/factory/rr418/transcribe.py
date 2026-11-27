# RR-418 Part D · the listen check's ears: offline faster-whisper (model already on this computer, CPU, no network) transcribes every
# clip of jobs.json. Writes scripts/factory/rr418/transcripts.json { model, clips: { KEY: text } }. The judging is done in TypeScript
# (src/lib/factory/rr418/listen-check.ts) so the offline test can re-run it.
#   python -I scripts/factory/rr418/transcribe.py scripts/factory/rr418/_work/jobs.json [--only KEY] [--model small]
import json, os, sys
os.environ.setdefault("HF_HUB_OFFLINE", "1")
from faster_whisper import WhisperModel

def main():
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    name = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else "small"
    out_path = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join("scripts", "factory", "rr418", "transcripts.json")
    model = WhisperModel(name, device="cpu", compute_type="int8", local_files_only=True)
    out = json.load(open(out_path, encoding="utf-8")) if os.path.exists(out_path) else {"model": f"faster-whisper {name}", "clips": {}}
    out["model"] = f"faster-whisper {name}"
    for j in jobs:
        if only and j["key"] != only:
            continue
        segs, _ = model.transcribe(j["file"], language="en", beam_size=5, vad_filter=False)
        out["clips"][j["key"]] = " ".join(s.text.strip() for s in segs)
        print(f"  heard {j['key']}: {len(out['clips'][j['key']].split())} words", flush=True)
        json.dump(out, open(out_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"transcribed {len(out['clips'])} clips")

main()
