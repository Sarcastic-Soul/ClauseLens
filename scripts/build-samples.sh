#!/usr/bin/env bash
# Regenerates the sample PDFs in samples/ from their HTML sources in samples/src/.
#
# The samples are synthetic documents written for this project. They are not
# real agreements and contain no personal data, which is why they can live in a
# public repository. Prompt tuning is done against real documents kept outside
# git (see private-samples/ in .gitignore).
#
# Requires LibreOffice on PATH.
set -euo pipefail

cd "$(dirname "$0")/.."
soffice --headless --convert-to pdf --outdir samples samples/src/*.html >/dev/null
echo "Rebuilt $(ls samples/*.pdf | wc -l) sample PDFs:"
ls -lh samples/*.pdf | awk '{print "  " $9 "  " $5}'
