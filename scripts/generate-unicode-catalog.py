"""Generate a small, explicitly partial offline Unicode reference.

Run with Python 3.12 for Unicode 15.0.0. The actual version is recorded,
not assumed. Browser segmentation may use a different Unicode version.
"""
import json
from pathlib import Path
import unicodedata as ud

ranges = [
    (0x20, 0x250), (0x300, 0x370), (0x600, 0x700), (0x900, 0x980),
    (0x1AB0, 0x1B00), (0x1DC0, 0x1E00), (0x2000, 0x2070),
    (0x20D0, 0x2100), (0x2500, 0x2600), (0xFE00, 0xFE10),
    (0xFE20, 0xFE30), (0x1F1E6, 0x1F200), (0x1F3FB, 0x1F400),
]
points = {cp for start, end in ranges for cp in range(start, end)}
points.update([0xFC5E, 0x1F44B, 0x1F468, 0x1F469, 0x1F467, 0x1F466, 0x1F577, 0x2728])
characters = {}
for cp in sorted(points):
    char = chr(cp)
    name = ud.name(char, None)
    if name:
        characters[f'{cp:X}'] = [name, ud.category(char), ud.combining(char)]
for cp, name in [(9, 'CHARACTER TABULATION'), (10, 'LINE FEED'), (13, 'CARRIAGE RETURN')]:
    characters[f'{cp:X}'] = [name, 'Cc', 0]
target = Path(__file__).resolve().parents[1] / 'dist' / 'unicode-names.json'
target.write_text(json.dumps({'version': ud.unidata_version, 'partial': True, 'characters': characters}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'{len(characters)} names · Unicode {ud.unidata_version} · {target.stat().st_size:,} bytes')
