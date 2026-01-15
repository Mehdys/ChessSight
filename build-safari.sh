#!/bin/bash
# Build script for Safari extension
# Swaps Safari-specific manifest before Xcode build

echo "🔧 Preparing Safari build..."

# Backup current manifest
if [ -f "manifest.json" ]; then
    cp manifest.json manifest.json.chrome-backup
    echo "✅ Backed up Chrome manifest"
fi

# Copy Safari manifest
cp manifest.safari.json manifest.json
echo "✅ Safari manifest activated"

echo "🎯 Ready to build Safari extension in Xcode"
echo "   After building, run: ./restore-chrome-manifest.sh"
