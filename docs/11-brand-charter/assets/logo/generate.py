"""Rebuild Tickr's vector logo from original ticket geometry and Manrope 800.

Requires Python 3 and fonttools[woff]; used to author assets, never at runtime.
Run from any working directory: python3 path/to/assets/logo/generate.py
"""

from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = Path(__file__).resolve().parent
FONT = HERE.parent / "fonts" / "manrope-latin.woff2"

# Original 48 x 48 construction: a 40 x 32 ticket, 6-unit corner radius,
# opposing 5-unit admission notches, and a three-slot perforated stub.
# Subpaths are cut out through evenodd fill; no masks, fonts, or external links.
TICKET = (
    "M10 8H38Q44 8 44 14V19C37.5 19 37.5 29 44 29V34"
    "Q44 40 38 40H10Q4 40 4 34V29C10.5 29 10.5 19 4 19V14Q4 8 10 8Z"
    "M30 13H33V18H30Z M30 22H33V26H30Z M30 30H33V35H30Z"
)


def wordmark_path():
    font = instantiateVariableFont(TTFont(FONT), {"wght": 800}, inplace=False)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    pen = SVGPathPen(glyphs, ntos=lambda value: f"{value:.3f}".rstrip("0").rstrip("."))
    x = 60.0
    scale = 0.023
    for character in "tickr":
        name = cmap[ord(character)]
        transform = TransformPen(pen, (scale, 0, 0, -scale, x, 40))
        glyphs[name].draw(transform)
        x += (font["hmtx"][name][0] - 20) * scale
    return pen.getCommands(), round(x + 4, 2)


wordmark, width = wordmark_path()
for reverse in (False, True):
    suffix = "-reverse" if reverse else ""
    color = "#FFFFFF" if reverse else "#233A42"
    for name, is_wordmark in (("wordmark", True), ("symbol", False)):
        title = "Tickr" if is_wordmark else "Tickr ticket symbol"
        description = "Original Tickr admission ticket mark."
        if is_wordmark:
            description += " Lowercase wordmark outlined from Manrope ExtraBold."
        geometry = f'<path fill-rule="evenodd" d="{TICKET}"/>'
        if is_wordmark:
            geometry += f'\n  <path d="{wordmark}"/>'
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width if is_wordmark else 48} 48" '
            f'role="img" aria-labelledby="title" fill="{color}">\n'
            f'  <title id="title">{title}</title>\n'
            f'  <desc>{description}</desc>\n'
            f'  {geometry}\n</svg>\n'
        )
        (HERE / f"{name}{suffix}.svg").write_text(svg, encoding="utf-8")
