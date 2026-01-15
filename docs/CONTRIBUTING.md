# Contributing to ChessSight

Thank you for your interest in contributing to ChessSight! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions. We're building a welcoming community for chess enthusiasts and developers.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** first to avoid duplicates
2. **Create a new issue** with a descriptive title
3. **Include**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS version
   - Screenshots if applicable
   - Extension version

### Suggesting Features

1. **Open a GitHub Discussion** to propose features
2. Explain the use case and benefits
3. Consider implementation complexity
4. Be open to feedback and iteration

### Submitting Pull Requests

1. **Fork the repository** and create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow coding standards (below)
   - Add comments for complex logic
   - Update documentation if needed

3. **Test thoroughly**:
   - Test on Chess.com and Lichess
   - Test on Chrome and Safari (if possible)
   - Verify backend API if modified

4. **Commit with clear messages**:
   ```bash
   git commit -m "Add feature: descriptive message"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```
   - Describe changes in PR description
   - Link related issues

## Development Setup

### Prerequisites
- Chrome or Safari browser
- Node.js 18+ (for tooling)
- Python 3.11+ (for backend)
- Stockfish (for backend testing)
- Xcode (for Safari development on macOS)

### Setup Steps

```bash
# Clone repository
git clone https://github.com/AlexPetrusca/ChessSight.git
cd ChessSight

# Chrome Extension
# Navigate to chrome://extensions/
# Enable Developer Mode
# Click "Load unpacked" → Select project directory

# Safari Extension  
./build-safari.sh
# Open Xcode project and build

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./start.sh
```

## Coding Standards

### JavaScript
- Use modern ES6+ syntax
- Use `const` and `let`, avoid `var`
- Use arrow functions for callbacks
- Add JSDoc comments for functions
- Keep functions focused and small

**Example**:
```javascript
/**
 * Scrapes the current chess position from the DOM
 * @returns {string} Position in custom format or 'no' if unavailable
 */
function scrapePosition() {
    // Implementation
}
```

### Python
- Follow PEP 8 style guide
- Use type hints
- Add docstrings for functions
- Use `logging` instead of `print`

**Example**:
```python
def init_stockfish() -> bool:
    """
    Initialize Stockfish as a persistent subprocess.
    
    Returns:
        bool: True if initialization successful, False otherwise
    """
    # Implementation
```

### File Organization
- Group related functions together
- Keep files under 1000 lines
- Extract reusable logic into separate modules
- Use descriptive file and variable names

## Testing Checklist

Before submitting a PR, verify:

### Extension
- [ ] Loads without errors in Chrome
- [ ] Loads without errors in Safari (if applicable)
- [ ] Works on Chess.com
- [ ] Works on Lichess.org
- [ ] Board detection functions correctly
- [ ] Move analysis displays properly
- [ ] Autoplay works (if modified)
- [ ] No console errors
- [ ] No broken UI elements

### Backend (if modified)
- [ ] Health endpoint returns 200
- [ ] Analysis endpoint works with valid FEN
- [ ] Handles invalid input gracefully
- [ ] Docker build succeeds
- [ ] docker-compose up works

## Project Structure

Key files to know:

```
src/scripts/content-script.js    # Position detection logic
src/popup/popup.js                # Main UI and engine integration
src/popup/chat_logic.js           # LLM integration
backend/app/main.py               # FastAPI backend
manifest.json                     # Chrome extension config
manifest.safari.json              # Safari extension config
```

## Git Workflow

1. **Main branch**: `master` - stable releases
2. **Feature branches**: `feature/feature-name`
3. **Bugfix branches**: `fix/bug-description`

## Documentation

When adding features:
- Update README.md if user-facing
- Update ARCHITECTURE.md if changing structure
- Update API.md if modifying backend
- Add inline comments for complex logic

## Performance Guidelines

- Avoid blocking the main thread
- Use caching where appropriate (LRU cache)
- Throttle expensive operations (DOM queries)
- Lazy load resources when possible
- Profile before optimizing

## Need Help?

- 💬 Ask in [GitHub Discussions](https://github.com/AlexPetrusca/ChessSight/discussions)
- 📧 Email the maintainer
- 📖 Read the [Architecture documentation](./ARCHITECTURE.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
