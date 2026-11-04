#!/bin/bash
# Klid – spuštění na Macu dvojklikem
cd "$(dirname "$0")" || exit 1
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null; then echo "Chybí Node.js – viz README."; read -r -p "Enter pro zavření"; exit 1; fi
node server.mjs --open
