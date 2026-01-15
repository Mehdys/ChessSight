// Temporary Safari-compatible engine using legacy Stockfish
// This version doesn't require SharedArrayBuffer

let safariEngine = null;

async function initSafariCompatibleEngine() {
    return new Promise((resolve) => {
        // Use legacy Stockfish.js from CDN (doesn't need SharedArrayBuffer)
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
        script.onload = () => {
            safariEngine = new Worker('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
            console.log('Safari-compatible Stockfish loaded');
            resolve(safariEngine);
        };
        script.onerror = () => {
            console.error('Failed to load Safari-compatible engine');
            resolve(null);
        };
        document.head.appendChild(script);
    });
}

// Export for use in popup.js
window.initSafariCompatibleEngine = initSafariCompatibleEngine;
