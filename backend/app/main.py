"""
ChessSight Remote Engine API
FastAPI server that runs Stockfish locally for chess position analysis
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import asyncio
import logging
import os
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ChessSight Engine API",
    description="Remote Stockfish chess engine analysis",
    version="2.0.0"
)

# Enable CORS for extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Extension origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    fen: str
    movetime: int = 3000  # milliseconds
    multipv: int = 3  # number of lines

class AnalysisResponse(BaseModel):
    bestmove: str
    evaluation: dict
    lines: list

# Stockfish process (keep alive for performance)
stockfish_process = None

def init_stockfish():
    """Initialize Stockfish as a persistent subprocess"""
    global stockfish_process
    try:
        # Check environment variable first, then try common locations
        stockfish_paths = [
            os.getenv('STOCKFISH_PATH', 'stockfish'),  # Environment variable or PATH
            'stockfish',  # If in PATH
            '/opt/homebrew/bin/stockfish',  # Homebrew on macOS
            '/usr/local/bin/stockfish',  # Linux standard
            '/usr/bin/stockfish',  # Alpine/Debian
            '/usr/games/stockfish',  # Some Linux distros
        ]
        
        for path in stockfish_paths:
            try:
                stockfish_process = subprocess.Popen(
                    [path],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1
                )
                # Test if it works
                stockfish_process.stdin.write("uci\n")
                stockfish_process.stdin.flush()
                response = stockfish_process.stdout.readline()
                if 'id name' in response or 'Stockfish' in response:
                    logger.info(f"✅ Stockfish initialized successfully: {path}")
                    return True
            except (FileNotFoundError, PermissionError) as e:
                logger.debug(f"Stockfish not found at {path}: {e}")
                continue
        
        logger.warning("⚠️  Stockfish not found. Install via: 'brew install stockfish' or 'apt-get install stockfish'")
        return False
    except Exception as e:
        logger.error(f"❌ Error initializing Stockfish: {e}")
        return False

@app.on_event("startup")
async def startup():
    init_stockfish()

@app.on_event("shutdown")
async def shutdown():
    if stockfish_process:
        stockfish_process.terminate()

@app.get("/")
async def root():
    """Health check endpoint with version and engine info"""
    return {
        "status": "running",
        "service": "ChessSight Engine API",
        "version": "2.0.0",
        "engine": {
            "name": "stockfish",
            "loaded": stockfish_process is not None
        }
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_position(request: AnalysisRequest):
    """Analyze a chess position and return best moves"""
    
    if not stockfish_process:
        logger.error("Analysis request failed: Stockfish engine not initialized")
        raise HTTPException(
            status_code=503,
            detail="Chess engine not available. Please check server logs."
        )
    
    try:
        # Configure engine
        stockfish_process.stdin.write(f"setoption name MultiPV value {request.multipv}\n")
        stockfish_process.stdin.write(f"position fen {request.fen}\n")
        stockfish_process.stdin.write(f"go movetime {request.movetime}\n")
        stockfish_process.stdin.flush()
        
        # Parse output
        lines = []
        bestmove = "(none)"
        
        while True:
            line = stockfish_process.stdout.readline().strip()
            
            if line.startswith('bestmove'):
                parts = line.split()
                bestmove = parts[1] if len(parts) > 1 else "(none)"
                break
            
            if 'info depth' in line and 'pv' in line:
                # Parse UCI info line
                line_data = parse_uci_info(line)
                if line_data:
                    lines.append(line_data)
        
        return {
            "bestmove": bestmove,
            "evaluation": lines[0] if lines else {},
            "lines": lines
        }
    
    except Exception as e:
        return {
            "bestmove": "(none)",
            "evaluation": {"error": str(e)},
            "lines": []
        }

def parse_uci_info(line: str) -> Optional[dict]:
    """Parse UCI info output into structured data"""
    try:
        tokens = line.split()
        data = {}
        
        i = 0
        while i < len(tokens):
            if tokens[i] == 'depth':
                data['depth'] = int(tokens[i + 1])
                i += 2
            elif tokens[i] == 'multipv':
                data['multipv'] = int(tokens[i + 1])
                i += 2
            elif tokens[i] == 'score':
                score_type = tokens[i + 1]
                score_value = int(tokens[i + 2])
                if score_type == 'cp':
                    data['score'] = score_value
                elif score_type == 'mate':
                    data['mate'] = score_value
                i += 3
            elif tokens[i] == 'pv':
                data['pv'] = ' '.join(tokens[i + 1:])
                data['move'] = tokens[i + 1] if len(tokens) > i + 1 else ''
                break
            else:
                i += 1
        
        return data if data else None
    except:
        return None

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting ChessSight Engine API on http://localhost:9090")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv('PORT', 9090)),
        log_level=os.getenv('LOG_LEVEL', 'info').lower()
    )
