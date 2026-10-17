#!/usr/bin/env bash
set -euo pipefail

chart_dir="$(cd "$(dirname "$0")/.." && pwd)"
repo_dir="$(cd "$chart_dir/../.." && pwd)"
session_name="tickr-brand-export-$$"
preview_dir="$chart_dir/assets/previews"
server_temp="$(mktemp -d)"
server_pid=""
mkdir -p "$preview_dir" "$repo_dir/output/playwright"
cd "$repo_dir"

pw() {
  npx --yes --package @playwright/cli@0.1.22 playwright-cli -s="$session_name" "$@"
}

cleanup() {
  pw close >/dev/null 2>&1 || true
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf "$server_temp"
}
trap cleanup EXIT

# Bind only to loopback and let the OS choose an available port.
python3 - "$chart_dir" "$server_temp/url" >"$repo_dir/output/playwright/brand-export-server.log" 2>&1 <<'PY' &
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=sys.argv[1]))
Path(sys.argv[2]).write_text(f'http://127.0.0.1:{server.server_port}')
server.serve_forever()
PY
server_pid="$!"
for attempt in {1..50}; do
  [[ -s "$server_temp/url" ]] && break
  sleep 0.1
done
server_url="$(cat "$server_temp/url")"

pw open "$server_url/coming-soon.html"
pw resize 1440 1000
pw run-code "async (page) => { await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: 'docs/11-brand-charter/assets/previews/coming-soon-desktop.png', scale: 'css' }); }"
pw resize 390 844
pw run-code "async (page) => { await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: 'docs/11-brand-charter/assets/previews/coming-soon-mobile.png', scale: 'css' }); }"
pw goto "$server_url/brand-book.html"
pw resize 1440 1000
pw run-code "async (page) => { await page.evaluate(() => document.fonts.ready); const overflow = await page.evaluate(() => [...document.querySelectorAll('.sheet')].flatMap(sheet => [...sheet.children].filter(el => el.tagName !== 'FOOTER' && el.getBoundingClientRect().bottom > sheet.getBoundingClientRect().bottom - 52).map(() => sheet.id))); if (overflow.length) throw new Error('Content reaches footer: ' + overflow.join(', ')); }"
pw run-code "async (page) => { await page.evaluate(() => document.fonts.ready); await page.pdf({ path: 'docs/11-brand-charter/tickr-charte-graphique.pdf', preferCSSPageSize: true, printBackground: true, tagged: true, outline: true }); }"

python3 - "$chart_dir" <<'PY'
from pathlib import Path
import sys
import fitz

chart = Path(sys.argv[1])
document = fitz.open(chart / 'tickr-charte-graphique.pdf')
assert len(document) == 24, f'Expected 24 pages, got {len(document)}'
for page in document:
    for link in page.get_links():
        assert not link.get('uri', '').startswith(('http://127.0.0.1', 'http://localhost')), 'Local server URL embedded in PDF'
document[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(
    chart / 'assets/previews/brand-cover.png'
)
print(f'Exported {len(document)} pages and three previews.')
PY
