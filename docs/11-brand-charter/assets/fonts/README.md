# Locally bundled typography

Retrieved 2026-10-17 from Google Fonts' official delivery service. All bundled font files are unmodified WOFF2 downloads, served locally by `../../tokens.css`; the charter and landing examples make no third-party font requests. Both families are distributed under the SIL Open Font License 1.1; the complete upstream notices are included alongside the fonts.

| File                  | Family and subset                                          | Declared design weights | Upstream file                                                                                                             |
| --------------------- | ---------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `manrope-latin.woff2` | Manrope, Latin including French accents                    | 400–800 variable        | [Google Fonts WOFF2](https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSvfedN4.woff2)                           |
| `readex-arabic.woff2` | Readex Pro, Arabic shaping subset                          | 400–700 variable        | [Google Fonts WOFF2](https://fonts.gstatic.com/s/readexpro/v27/SLXYc1bJ7HE5YDoGPuzj_dh8uc7wUy8ZQQyX2Iw1ZEzehiB9Q1U.woff2) |
| `readex-latin.woff2`  | Readex Pro, Latin companion for punctuation and mixed text | 400–700 variable        | [Google Fonts WOFF2](https://fonts.gstatic.com/s/readexpro/v27/SLXYc1bJ7HE5YDoGPuzj_dh8uc7wUy8ZQQyX2IwwZEzehiB9.woff2)    |

The downloaded Manrope binary contains a 200–800 weight axis; Readex Pro contains a 160–700 axis. The design system intentionally exposes only the ranges above. These are delivery subsets supplied by Google, without further local modification. Manrope is used for French and English UI, headings, and figures. Readex Pro is used for Arabic at 400–700; Arabic letter-spacing remains normal and uses a line height of at least 1.6. Apply `lang="ar"` and `dir="rtl"` to Arabic content and preserve logical source order.

Official family information:

- [Manrope on Google Fonts](https://fonts.google.com/specimen/Manrope)
- [Readex Pro on Google Fonts](https://fonts.google.com/specimen/Readex+Pro)
- [Google Fonts delivery CSS](https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&family=Readex+Pro:wght@400..700&display=swap), retrieved using a current desktop browser user agent to receive WOFF2 variable subsets.

License provenance:

- `OFL-Manrope.txt`: [exact upstream license](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt). Copyright 2018 The Manrope Project Authors.
- `OFL-Readex-Pro.txt`: [exact upstream license](https://raw.githubusercontent.com/google/fonts/main/ofl/readexpro/OFL.txt). Copyright 2018 The Readex Pro Project Authors, with Reserved Font Name “RevReading Lexend”.

Keep both copyright notices and licenses when redistributing the font files. Outlined logo lettering is a document created with the font; its editable construction source is supplied in `../logo/generate.py`.

SHA-256 of the downloaded files:

```text
e310b55a7fd9677f5e3555e6c6c4d064fa1f1d24393f0ddbe217cea12a8c432f  manrope-latin.woff2
1a432d26fc51264ab2107cd379522ee1ea0d8301b717902e2f20d641a43c0658  readex-arabic.woff2
87022255400cd42a181da336332f553676b11a4808678ba5e18ce12fa0e1f8d9  readex-latin.woff2
```
