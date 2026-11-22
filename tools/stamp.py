"""Stamp styles.css / app.js references in index.html with a content hash.

Run before every push:  python3 tools/stamp.py
A changed file gets a new URL, so browsers never pair new HTML with an old
cached stylesheet or script."""
import hashlib, re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = root / "index.html"
v = lambda name: hashlib.md5((root / name).read_bytes()).hexdigest()[:8]
s = html.read_text(encoding="utf-8")
s = re.sub(r'href="styles\.css(\?v=[0-9a-f]+)?"', f'href="styles.css?v={v("styles.css")}"', s)
s = re.sub(r'src="app\.js(\?v=[0-9a-f]+)?"', f'src="app.js?v={v("app.js")}"', s)
html.write_text(s, encoding="utf-8")
print("stamped", v("styles.css"), v("app.js"))
