#!/usr/bin/env bash
#
# Download the audio clips for both themes from the upstream release DMGs.
# The clips are copyrighted excerpts and are NOT tracked in git (same
# distribution policy as upstream, which ships them only in release DMGs).
#
# Requires: curl, 7z (package p7zip-full), ffmpeg (only if transcoding needed).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fetch_theme() {
  local url="$1" theme="$2"
  local dmg="$TMP/$theme.dmg"
  local out="$ROOT/themes/$theme/clips"

  echo "==> $theme: downloading $url"
  curl -fL --retry 3 -o "$dmg" "$url"

  echo "==> $theme: extracting clips"
  local ex="$TMP/$theme-extract"
  mkdir -p "$ex" "$out"
  # 7z can read HFS+/APFS dmg images; extract only the clips folder.
  7z x -y -o"$ex" "$dmg" >/dev/null || true

  local found=0
  while IFS= read -r -d '' f; do
    found=1
    local base ext
    base="$(basename "$f")"
    ext="${base##*.}"
    case "${ext,,}" in
      aiff|aif|caf)
        # Chromium cannot decode aiff/caf — transcode to m4a.
        local m4a="$out/${base%.*}.m4a"
        echo "    transcoding $base -> $(basename "$m4a")"
        ffmpeg -y -loglevel error -i "$f" -c:a aac "$m4a"
        ;;
      *)
        cp -f "$f" "$out/"
        ;;
    esac
  done < <(find "$ex" -type d -name clips -path '*/Resources/*' -print0 \
           | xargs -0 -I{} find {} -type f -print0)

  if [ "$found" -eq 0 ]; then
    echo "!!  $theme: no clips found in DMG" >&2
    return 1
  fi
  echo "==> $theme: $(ls "$out" | wc -l) clips in themes/$theme/clips/"
}

fetch_theme "https://github.com/andrearicciotti1/armadillo-bar/releases/latest/download/ArmadilloBar-1.0.dmg" armadillo
fetch_theme "https://github.com/andrearicciotti1/boris-bar/releases/latest/download/BorisBar-1.0.dmg" boris
