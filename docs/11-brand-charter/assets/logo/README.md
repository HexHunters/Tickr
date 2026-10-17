# Tickr identity assets

These are proposed original identity assets prepared for the Tickr design charter on 2026-10-17.

| File                   | Use                                                        |
| ---------------------- | ---------------------------------------------------------- |
| `wordmark.svg`         | Ink lockup for white, canvas, and approved pastel surfaces |
| `wordmark-reverse.svg` | White lockup for night or action surfaces                  |
| `symbol.svg`           | Ink ticket symbol for compact placements                   |
| `symbol-reverse.svg`   | White ticket symbol for dark placements                    |

Every SVG contains outlined geometry, a title, and no external assets. The lowercase lettering uses Manrope ExtraBold at weight 800, converted from the bundled font to paths. The ticket symbol is original geometry: a 40 × 32 unit body on a 48 unit grid, two opposing admission notches, and three perforation slots. It uses a single flat color.

Rebuild with Python 3 and `fonttools[woff]` installed in a temporary virtual environment:

```sh
python3 docs/11-brand-charter/assets/logo/generate.py
```

The source uses the locally bundled Manrope font; see [font provenance and license](../fonts/README.md). No network request is required to rebuild.

Use the supplied proportions. Minimum lockup width: 88 CSS px; minimum symbol box: 24 CSS px. Keep clear space equal to at least one quarter of the symbol box around the outer artwork. Do not crop the notches, stretch the wordmark, add glows, gradients, outlines, or rotate the lockup. For a 16 px favicon, create and review a separate simplified optical asset rather than shrinking this master.
