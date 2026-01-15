# System Architecture
 
 ChessSight is a browser extension ecosystem that provides real-time chess analysis for online chess platforms. The system is designed for high performance, utilizing WebAssembly (WASM) for client-side evaluation and an optional Python backend for heavy-duty analysis.
 
 ## High-Level Overview
 
 ```mermaid
 graph TD
     subgraph "Browser Extension (Chrome/Safari)"
         CS[Content Script] <-->|Port Communication| BG[Background Service]
         BG <-->|Port Communication| UI[Popup/Sidebar UI]
         UI <-->|UCI Protocol| WE[WASM Engine Worker]
     end
 
     subgraph External Clients
         Web[Chess.com / Lichess]
     end
 
     subgraph "Optional Local Backend"
         UI -.->|HTTP/WebSocket| API[FastAPI Server]
         API -->|Subprocess| SE[Stockfish Binary]
         API -.->|REST| LLM[LLM Provider]
     end
 
     Web -->|Scaped by| CS
 ```
 
 ## Core Components
 
 ### 1. Content Script
 - **Role**: Observer & Actuator
 - **Functionality**:
   - Detects the active chess website (e.g., Chess.com, Lichess).
   - Scrapes board state (FEN) via DOM inspection or move list parsing.
   - Listens for DOM mutations to trigger re-analysis.
   - Highlights best moves directly on the board using SVGs or canvas overlays.
 
 ### 2. Background Service
 - **Role**: Orchestrator
 - **Functionality**:
   - Manages the lifecycle of the extension (install, update, suspend).
   - Facilitates long-lived connections between the Content Script and the UI.
   - Handles sidebar/popup toggling.
 
 ### 3. User Interface (Popup/Sidebar)
 - **Role**: Control Center via `popup.js`
 - **Functionality**:
   - Hosts the `chessboard.js` visualization.
   - Manages the **Chess Engine** lifecycle (Web Workers).
   - Draws evaluation bars and arrows.
   - Provides chat interface for LLM interaction.
 
 ### 4. Analysis Engines
 - **WASM (Client-Side)**:
   - **Stockfish 16**: Standard CPU-based analysis compiled to WebAssembly.
   - **Fairy-Stockfish**: For variants (Crazyhouse, Atomic, etc.).
   - **Lc0**: Neural network-based engine (requires significant browser resources).
 - **Remote (Local Server)**:
   - Python-based FastAPI server.
   - Runs native binary engines for maximum performance (avoids browser thread limits).
 
 ## Data Flow
 
 1. **Detection**: User makes a move on Chess.com.
 2. **Extraction**: Content script detects DOM change -> Extracts new FEN.
 3. **Transmission**: FEN is sent to Popup via Background Service.
 4. **Analysis**: 
    - **Local**: Popup sends `position fen <fen>` -> `go movetime <t>` to WASM Worker.
    - **Remote**: Popup POSTs to `localhost:9090/analyze`.
 5. **Visualization**: Engine returns `bestmove e2e4` -> UI draws green arrow on board.
 
 ## Directory Structure
 
 | Path | Description |
 | :--- | :--- |
 | `src/` | Extension source code (JS, HTML, CSS). |
 | `backend/` | Python FastAPI server and Docker config. |
 | `lib/engine/` | Compiled WASM engine binaries and NNUE networks. |
 | `Safari/` | Native Swift project for macOS App Extension. |
 | `docs/` | Project documentation. |
