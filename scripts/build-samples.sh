#!/usr/bin/env bash
# Regenerates public/samples/*.pdf from the HTML sources in samples/.
#
# These are synthetic documents written for this project. They are not real
# agreements and contain no personal data, which is why they can live in a
# public repository. Prompt tuning is done against real documents kept outside
# git (see private-samples/ in .gitignore).
#
# They live under public/ so the deployed app can offer them as one-click
# examples — a visitor should not have to find a contract before trying this.
#
# Requires LibreOffice on PATH.
set -euo pipefail

cd "$(dirname "$0")/.."
soffice --headless --convert-to pdf --outdir public/samples samples/*.html >/dev/null
echo "Rebuilt $(ls public/samples/*.pdf | wc -l) sample PDFs:"
ls -lh public/samples/*.pdf | awk '{print "  " $9 "  " $5}'
