#!/bin/bash
# Restore Chrome manifest after Safari build

echo "🔄 Restoring Chrome manifest..."

if [ -f "manifest.json.chrome-backup" ]; then
    cp manifest.json.chrome-backup manifest.json
    rm manifest.json.chrome-backup
    echo "✅ Chrome manifest restored"
else
    echo "⚠️  No backup found - using current manifest"
fi
