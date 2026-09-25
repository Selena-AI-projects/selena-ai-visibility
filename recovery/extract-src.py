import json, os, sys, pathlib, re
root = pathlib.Path.home() / "selena-m0-recovery"
out = root / "web-src"
maps = sorted((root / "web").rglob("*.map"))
written = skipped_nm = no_content = 0
files = set()
for m in maps:
    try:
        d = json.loads(m.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        continue
    srcs = d.get("sources") or []
    cont = d.get("sourcesContent")
    if not cont:
        no_content += 1
        continue
    for s, c in zip(srcs, cont):
        if c is None:
            continue
        p = re.sub(r"^(\.\./)+", "", s.replace("\\", "/")).lstrip("/")
        if "node_modules" in p:
            skipped_nm += 1
            continue
        dest = out / p
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and dest.read_text(encoding="utf-8", errors="replace") == c:
            continue
        dest.write_text(c, encoding="utf-8")
        files.add(str(dest))
        written += 1
print("maps scanned:", len(maps))
print("maps without sourcesContent:", no_content)
print("source files written:", len(files))
print("node_modules sources skipped:", skipped_nm)
