![ChessSight Banner](./res/chesssight_banner.png)

<p align="center">
  <strong>AI-Powered Chess Analysis Extension</strong>
</p>

<p align="center">
  <a href="https://github.com/AlexPetrusca/ChessSight/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/AlexPetrusca/ChessSight/releases"><img src="https://img.shields.io/badge/version-2.0.0-brightgreen.svg" alt="Version"></a>
  <img src="https://img.shields.io/badge/chrome-supported-success.svg" alt="Chrome">
  <img src="https://img.shields.io/badge/safari-supported-success.svg" alt="Safari">
</p>

---

## ✨ Features

- **🎯 Real-time Analysis** - Get instant best move suggestions powered by Stockfish
- **📊 Multiple Lines** - See top 3 move candidates with evaluations  
- **🎨 Visual Arrows** - Clear move annotations directly on the board
- **🤖 AI Chat Assistant** - Ask questions about positions using LLM integration (Ollama/OpenAI)
- **⚡ Auto-play** - Optionally automate moves for puzzles and practice
- **🌐 Multi-Site Support** - Works on Chess.com, Lichess.org, and BlitzTactics
- **🎮 Game Variant Support** - Standard, Chess960, Crazyhouse, and more
- **🔄 Remote or Local Engine** - Use built-in WASM engines or remote Stockfish API
- **📱 Dual Platform** - Available for both Chrome and Safari

---

## 🚀 Quick Start

### Chrome Extension

1. **Install from Chrome Web Store** (recommended)
   - Coming soon to the Chrome Web Store!

2. **Or load unpacked** (development):
   ```bash
   git clone https://github.com/AlexPetrusca/ChessSight.git
   cd ChessSight
   # Open chrome://extensions/
   # Enable "Developer mode"
   # Click "Load unpacked" and select this directory
   ```

### Safari Extension

1. **Build in Xcode**:
   ```bash
   git clone https://github.com/AlexPetrusca/ChessSight.git
   cd ChessSight
   ./build-safari.sh
   xcodebuild -project "Safari/Mephisto Chess Extension/Mephisto Chess Extension.xcodeproj" \
     -scheme "Mephisto Chess Extension (macOS)" build
   ```

2. **Enable in Safari**:
   - Run the built app once
   - Safari → Settings → Extensions
   - Enable "ChessSight"
   - Grant permissions when prompted

### Backend API (Optional)

For remote engine analysis, run the backend server:

```bash
cd backend
# Install dependencies
pip install -r requirements.txt

# Install Stockfish
brew install stockfish  # macOS
# or apt-get install stockfish  # Linux

# Start server
./start.sh
```

Or use Docker:

```bash
cd backend
docker-compose up -d
```

---

## 📖 Usage

1. **Open ChessSight**: Click the extension icon or open the side panel (Chrome)
2. **Navigate to a chess site**: Go to Chess.com, Lichess, or BlitzTactics
3. **Start a game**: The extension automatically detects the board position
4. **View analysis**: See best move suggestions with arrows and evaluation scores
5. **Chat with AI** (optional): Ask questions about the position using the chat feature

### Configuration

Click the ⚙️ icon to customize:
- Engine selection (Stockfish 16/17, Lc0, Fairy Stockfish)
- Computation time
- Number of analysis lines
- Autoplay settings
- LLM provider (Ollama or OpenAI)

---

## 🏗️ Architecture

**Extension Components**:
- **Content Script** - Detects board positions on chess websites
- **Popup/Sidebar** - Displays analysis UI and chess board
- **Background Script** - Routes messages between components
- **Chess Engines** - Stockfish WASM builds or remote API

**Backend API**:
- FastAPI server running Stockfish locally
- Provides `/analyze` endpoint for position evaluation
- Dockerized for easy deployment

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🛠️ Development

### Prerequisites
- Node.js 18+ (for development tools)
- Python 3.11+ (for backend)
- Xcode (for Safari extension on macOS)

### Local Development

```bash
# Clone repository
git clone https://github.com/AlexPetrusca/ChessSight.git
cd ChessSight

# Chrome: Load unpacked extension
# Safari: Build with build-safari.sh

# Backend development
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Testing

```bash
# Test backend
cd backend
curl http://localhost:9090/
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}'
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 📚 Documentation

- [Build Instructions](./BUILD.md) - Dual-platform build guide
- [Architecture](./ARCHITECTURE.md) - Technical overview
- [API Documentation](./API.md) - Backend API reference
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines
- [Roadmap](./ROADMAP.md) - Future plans

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

**Ways to contribute**:
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📝 Improve documentation  
- 🔧 Submit pull requests

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Stockfish** - Powerful open-source chess engine
- **Leela Chess Zero** - Neural network chess engine
- **Fairy-Stockfish** - Chess variant support
- **chessboard.js** & **chess.js** - Chess UI libraries
- Original **Mephisto** project contributors

---

## 💬 Support

- 🐛 Issues: [GitHub Issues](https://github.com/Mehdys/ChessSight/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Mehdys/ChessSight/discussions)

---

<p align="center">
  Made with ♟️ by <a href="https://github.com/AlexPetrusca">Alex Petrusca</a>
</p>

