#!/bin/bash
# Start Mephisto Engine API

echo "🚀 Starting Mephisto Engine API..."

# Check if stockfish is installed
if ! command -v stockfish &> /dev/null; then
    echo "⚠️  Stockfish not found. Installing via Homebrew..."
    brew install stockfish
fi

# Install Python dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start the API server
echo "✅ Starting API on http://localhost:9090"
python app/main.py
