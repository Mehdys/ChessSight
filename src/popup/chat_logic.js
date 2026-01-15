
// -------------------------------------------------------------------------------------------
// LLM Chat Logic
// -------------------------------------------------------------------------------------------

function updateTopMovesUI() {
    const container = document.getElementById('top-moves');
    if (!container || !last_eval || !last_eval.lines) return;

    let html = '';
    // Sort lines by score if available, or just use index
    // Usually lines are already sorted by engine, but we check valid lines
    for (let i = 0; i < last_eval.lines.length; i++) {
        const line = last_eval.lines[i];
        if (!line || !line.move) continue;

        const score = (turn === 'w' ? 1 : -1) * line.score / 100;
        const scoreText = (line.mate) ? `#${line.mate}` : (score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2));
        const moveText = line.move; // UCI notation (e.g. 'e2e4'), consider converting to SAN (e.g. 'e4') for better readability

        html += `<div class="move-chip" onclick="document.getElementById('chat-input').value = 'Why is ${moveText} good?'; document.getElementById('chat-input').focus();">
            ${moveText} <span style="font-size:10px; color:#666;">(${scoreText})</span>
        </div>`;
    }
    container.innerHTML = html || 'Thinking...';
}

async function sendMessageToLLM() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Add user message to UI
    appendMessage(message, 'user');
    input.value = '';

    // Context Building
    const fen = last_eval.fen;
    let analysisContext = "Here is the current analysis from Stockfish:\n";
    if (last_eval.lines) {
        last_eval.lines.forEach((line, i) => {
            if (line && line.move) {
                const score = (turn === 'w' ? 1 : -1) * line.score / 100;
                const scoreText = (line.mate) ? `Mate in ${line.mate}` : `Score: ${score.toFixed(2)}`;
                analysisContext += `Rank ${i + 1}: Move ${line.move}, ${scoreText}. Line: ${line.pv}\n`;
            }
        });
    }

    const systemPrompt = `You are a Grandmaster Chess Coach. The user asks about the current position.
    FEN: ${fen}
    ${analysisContext}
    
    Explain the position or answer the specific question. 
    Use the Stockfish analysis to verify which move is actually best.
    If the user suggests a move that is NOT in the top lines, warn them it might be a mistake.
    Be friendly, concise, and helpful.`;

    const provider = localStorage.getItem('llm_provider') || 'ollama';
    const baseUrl = localStorage.getItem('llm_base_url') || 'http://localhost:11434/v1';
    const apiKey = localStorage.getItem('llm_api_key') || '';

    // Show loading
    const loadingId = appendMessage('Thinking...', 'assistant', true);

    try {
        let headers = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // Standard OpenAI Chat Completion format (Works for Ollama too)
        const body = {
            model: (provider === 'openai') ? 'gpt-4o' : 'llama3', // Default model names, can be made configurable
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            stream: false
        };

        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            throw new Error(`API Error: ${res.statusText}`);
        }

        const data = await res.json();
        const reply = data.choices[0].message.content;

        updateMessage(loadingId, reply);

    } catch (e) {
        console.error(e);
        updateMessage(loadingId, `Error: ${e.message}. Check your API settings.`);
    }
}

function appendMessage(text, role, isLoading = false) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}`;
    msgDiv.innerText = text;
    if (isLoading) msgDiv.id = 'msg-loading-' + Date.now();
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgDiv.id;
}

function updateMessage(id, text) {
    const msgDiv = document.getElementById(id);
    if (msgDiv) {
        msgDiv.innerText = text;
        // Re-scroll
        const container = document.getElementById('chat-messages');
        container.scrollTop = container.scrollHeight;
    }
}

// Hook up events
document.getElementById('send-btn').addEventListener('click', sendMessageToLLM);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessageToLLM();
});
