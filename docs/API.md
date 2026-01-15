# ChessSight Backend API

## Base URL

```
http://localhost:9090
```

## Authentication

No authentication required for local deployment.

## Endpoints

### GET /

Health check endpoint with service information.

**Response** `200 OK`:
```json
{
  "status": "running",
  "service": "ChessSight Engine API",
  "version": "2.0.0",
  "engine": {
    "name": "stockfish",
    "loaded": true
  }
}
```

**Example**:
```bash
curl http://localhost:9090/
```

---

### POST /analyze

Analyze a chess position using Stockfish.

**Request Body**:
```json
{
  "fen": "string",         // FEN notation of position
  "movetime": 3000,        // Analysis time in milliseconds (optional, default: 3000)
  "multipv": 3             // Number of best lines to return (optional, default: 3)
}
```

**Response** `200 OK`:
```json
{
  "bestmove": "e2e4",      // Best move in UCI notation
  "evaluation": {          // Top line evaluation
    "depth": 20,
    "multipv": 1,
    "score": 25,           // Centipawn score
    "move": "e2e4",
    "pv": "e2e4 e7e5..."   // Principal variation
  },
  "lines": [               // All analysis lines
    {
      "depth": 20,
      "multipv": 1,
      "score": 25,
      "move": "e2e4",
      "pv": "e2e4 e7e5 g1f3 b8c6"
    },
    {
      "depth": 20,
      "multipv": 2,
      "score": 18,
      "mate": null,        // Mate in N moves (if applicable)
      "move": "d2d4",
      "pv": "d2d4 d7d5 c2c4..."
    }
  ]
}
```

**Response** `503 Service Unavailable`:
```json
{
  "detail": "Chess engine not available. Please check server logs."
}
```

**Examples**:

```bash
# Starting position analysis
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "movetime": 3000,
    "multipv": 3
  }'

# Quick analysis (1 second)  
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    "movetime": 1000,
    "multipv": 1
  }'

# Complex position
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "fen": "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8"
  }'
```

---

## Data Types

### FEN String

Standard Forsyth-Edwards Notation:
```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

Components:
1. Piece placement
2. Active color (w/b)
3. Castling availability
4. En passant target
5. Halfmove clock
6. Fullmove number

### UCI Move Format

Format: `[from_square][to_square][promotion]`

Examples:
- `e2e4` - pawn to e4
- `e7e8q` - pawn promotion to queen
- `e1g1` - kingside castle (white)

### Score  

Centipawn evaluation from engine perspective:
- Positive: advantage for side to move
- Negative: disadvantage for side to move
- `100` centipawns = 1 pawn advantage

Special cases:
- `mate: N` - checkmate in N moves
- Large negative score - losing position

---

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 503 | Engine not initialized | Check Stockfish installation |
| 422 | Validation error | Check request body format |
| 500 | Internal server error | Check logs for details |

---

## Running the API

### Local Development

```bash
cd backend
pip install -r requirements.txt
./start.sh
```

### Docker

```bash
cd backend
docker-compose up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9090` | Server port |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `STOCKFISH_PATH` | `stockfish` | Path to Stockfish binary |

---

## Performance

- Average analysis time: 1-3 seconds (depending on `movetime`)
- Maximum multipv: 5 (practical limit)
- Concurrent requests: Supported but shares single Stockfish process

---

## Limitations

- Single Stockfish process (no parallelization)
- No move history caching
- No authentication
- Local deployment only (not production-ready for public access)

---

## Future Enhancements

- Redis caching for common positions
- WebSocket support for streaming analysis
- Multiple engine backends (Lc0, Komodo)
- Rate limiting
- API key authentication
