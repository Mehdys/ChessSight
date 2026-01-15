# Distributing ChessSight

ChessSight is designed to be a "Simple App" that works out-of-the-box using local WebAssembly (WASM) analysis. Users do **not** need to install Python or Docker.

## Option 1: Share as a ZIP (Easiest)
You can share the extension with friends or users directly.

1.  **Create the ZIP**:
    Run this command in your terminal to create a clean zip file, excluding developer files:
    ```bash
    zip -r ChessSight-v2.0.0.zip . -x "*.git*" -x "backend/*" -x "docs/*" -x "*.DS_Store*"
    ```

2.  **Installation Instructions for Users**:
    Send them the `.zip` file and these instructions:
    1.  Unzip `ChessSight-v2.0.0.zip`.
    2.  Open Chrome and navigate to `chrome://extensions`.
    3.  Enable **"Developer mode"** (toggle in the top right).
    4.  Click **"Load unpacked"**.
    5.  Select the unzipped folder.
    6.  **Done!** Go to any Chess.com or Lichess game to see it in action.

## Option 3: GitHub Release (Recommended for GitHub)
This makes your repository look like a professional product download page.

1.  **Create the ZIP**:
    ```bash
    zip -r ChessSight-v2.1.0.zip . -x "*.git*" -x "backend/*" -x "docs/*" -x "*.DS_Store*"
    ```
2.  **Draft Release**:
    *   Go to your GitHub Repo -> **Releases** (sidebar) -> "Draft a new release".
    *   **Tag version**: `v2.1.0`.
    *   **Title**: "ChessSight v2.1.0 - Light Version".
    *   **Description**: "Simple one-click analysis tool. No Python required."
    *   **Attach binaries**: Upload the `ChessSight-v2.1.0.zip` file you just created.
3.  **Publish**: Click "Publish release".

Now users can just click "Releases" and download the zip!

## Architecture Note
This distribution uses the **Client-Side WASM Engine** by default.
- **Pros**: Zero setup, works offline, privacy-friendly.
- **Cons**: Uses user's CPU.
- **Backend**: The Python backend code has been excluded from this distribution method to keep it simple.
