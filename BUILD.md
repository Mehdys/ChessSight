# ChessSight - Dual-Platform Build Instructions

## Chrome Extension

**No changes needed!** The original `manifest.json` is preserved for Chrome.

### Build for Chrome
1. Package the extension:
   ```bash
   # Load unpacked in Chrome
   # Navigate to chrome://extensions
   # Enable Developer Mode
   # Click "Load unpacked" and select this directory
   ```

2. Publish to Chrome Web Store (when ready):
   - Use existing `manifest.json`
   - All Chrome-specific features work (Side Panel, etc.)

---

## Safari Extension

### Build for Safari

1. **Swap to Safari manifest:**
   ```bash
   ./build-safari.sh
   ```

2. **Build in Xcode:**
   ```bash
   xcodebuild -project "Safari/Mephisto Chess Extension/Mephisto Chess Extension.xcodeproj" \
     -scheme "Mephisto Chess Extension (macOS)" \
     -configuration Debug build
   ```
   
   Or open in Xcode and build (⌘B)

3. **Restore Chrome manifest:**
   ```bash
   ./restore-chrome-manifest.sh
   ```

### Enable in Safari

1. Build the macOS app in Xcode
2. Run the app once (it opens a welcome screen)
3. Safari → Settings → Extensions
4. Enable "ChessSight"
5. Grant permissions when prompted

### Safari vs Chrome Differences

| Feature | Chrome | Safari |
|---------|--------|--------|
| UI Location | Side Panel | Popup |
| Manifest | `manifest.json` | `manifest.safari.json` |
| Background Script | Service Worker | Service Worker |
| Content Scripts | Full speed | Throttled (1s) |

---

## Development Workflow

### When developing:
1. Make code changes to shared files (`src/`, `lib/`, `res/`)
2. Test in Chrome (no build needed - reload extension)
3. Test in Safari:
   ```bash
   ./build-safari.sh && \
   xcodebuild -project "Safari/Mephisto Chess Extension/Mephisto Chess Extension.xcodeproj" \
     -scheme "Mephisto Chess Extension (macOS)" build && \
   ./restore-chrome-manifest.sh
   ```

### Before committing:
- Ensure `manifest.json` is the Chrome version
- Both `manifest.json` and `manifest.safari.json` are tracked in git
- Build scripts are executable (`chmod +x *.sh`)

---

## Key Files

- `manifest.json` - Chrome manifest (with Side Panel)
- `manifest.safari.json` - Safari manifest (with standard popup)
- `build-safari.sh` - Swaps to Safari manifest
- `restore-chrome-manifest.sh` - Restores Chrome manifest
- `src/scripts/background-script.js` - Shared (works on both)
- `src/scripts/content-script.js` - Shared (throttled for Safari)

---

## Troubleshooting

### Safari extension not loading
- Check Safari → Settings → Extensions
- Rebuild in Xcode (clean build folder first)
- Check Console.app for errors

### Popup not opening
- Verify `default_popup` in Safari manifest
- Check Web Inspector for popup errors

### Content script not working
- Open Web Inspector on chess.com tab
- Check for content script injection errors
- Verify permissions granted in Safari settings

---

## Backend Deployment (Docker)

### Build and Run

```bash
cd backend
docker-compose up -d
```

The backend will be available at `http://localhost:9090`.

### Verify Deployment

```bash
# Health check
curl http://localhost:9090/

# Test analysis
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}'
```

### Stop Backend

```bash
cd backend
docker-compose down
```
