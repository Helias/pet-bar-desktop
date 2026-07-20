#!/bin/bash
set -e
cd "$(dirname "$0")"

APP="ArmadilloBar.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/clips"

# Universal binary (arm64 + x86_64) pinned to macOS 13.0 deployment target.
TARGETS=("arm64-apple-macos13.0" "x86_64-apple-macos13.0")
TMP=$(mktemp -d)
SOURCES=(armadillo_bar.swift ArmadilloClippyWindow.swift ClippyBubblePanel.swift ArmadilloAskWindow.swift)
for t in "${TARGETS[@]}"; do
  swiftc "${SOURCES[@]}" -O \
    -target "$t" \
    -o "$TMP/ArmadilloBar-${t%%-*}" \
    -framework Cocoa \
    -framework AVFoundation \
    -framework ServiceManagement
done
lipo -create "$TMP"/ArmadilloBar-* -output "$APP/Contents/MacOS/ArmadilloBar"
rm -rf "$TMP"

cp Info.plist            "$APP/Contents/Info.plist"
[ -f assets/armadillo.png ]          && cp assets/armadillo.png          "$APP/Contents/Resources/armadillo.png"
[ -f assets/armadillo-menubar.png ]  && cp assets/armadillo-menubar.png  "$APP/Contents/Resources/armadillo-menubar.png"
[ -f assets/armadillo.svg ]  && cp assets/armadillo.svg  "$APP/Contents/Resources/armadillo.svg"
[ -f assets/AppIcon.icns ]           && cp assets/AppIcon.icns           "$APP/Contents/Resources/AppIcon.icns"
[ -f assets/armadillo-open.png ]     && cp assets/armadillo-open.png     "$APP/Contents/Resources/armadillo-open.png"
[ -f assets/Bangers-Regular.ttf ]    && cp assets/Bangers-Regular.ttf    "$APP/Contents/Resources/Bangers-Regular.ttf"
[ -f assets/bubble.png ]             && cp assets/bubble.png             "$APP/Contents/Resources/bubble.png"
[ -f assets/bubble-up.png ]          && cp assets/bubble-up.png          "$APP/Contents/Resources/bubble-up.png"
cp DISCLAIMER.txt        "$APP/Contents/Resources/DISCLAIMER.txt"
cp LICENSE               "$APP/Contents/Resources/LICENSE.txt"
for ext in mp3 mp4 m4a wav aiff aif caf; do
  cp assets/clips/*.$ext "$APP/Contents/Resources/clips/" 2>/dev/null || true
done

xattr -cr "$APP"
codesign --force --deep --sign - "$APP"
echo "Built $APP"
