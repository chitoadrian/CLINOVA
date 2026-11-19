#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v cargo >/dev/null || { echo 'Falta Rust/Cargo.' >&2; exit 1; }
command -v npm >/dev/null || { echo 'Falta Node.js/npm.' >&2; exit 1; }
pkg-config --exists webkit2gtk-4.1 || { echo 'Falta WebKitGTK 4.1; consultar el manual técnico.' >&2; exit 1; }
npm ci
npm test
python3 tests/test_sqlite.py
npm run desktop:build -- --bundles deb,appimage
echo 'Paquetes: src-tauri/target/release/bundle/. Probarlos en Linux antes de distribuir.'
