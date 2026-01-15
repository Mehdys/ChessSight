import { Chess } from '../../lib/chess.js';
import { VoiceCoach } from './voice.js';

let engine;
let board;
let voiceCoach;
let fen_cache;
let config;

let is_calculating = false;
let prog = 0;
let last_eval = { fen: '', activeLines: 0, lines: [] };
let turn = ''; // 'w' | 'b'

document.addEventListener('DOMContentLoaded', async function () {
    // load extension configurations from localStorage
    const computeTime = JSON.parse(localStorage.getItem('compute_time'));
    const fenRefresh = JSON.parse(localStorage.getItem('fen_refresh'));
    const thinkTime = JSON.parse(localStorage.getItem('think_time'));
    const thinkVariance = JSON.parse(localStorage.getItem('think_variance'));
    const moveTime = JSON.parse(localStorage.getItem('move_time'));
    const moveVariance = JSON.parse(localStorage.getItem('move_variance'));
    config = {
        // general settings
        engine: JSON.parse(localStorage.getItem('engine')) || 'stockfish-16-nnue-7',
        variant: JSON.parse(localStorage.getItem('variant')) || 'chess',
        compute_time: (computeTime != null) ? computeTime : 3000,
        fen_refresh: (fenRefresh != null) ? fenRefresh : 100,
        multiple_lines: JSON.parse(localStorage.getItem('multiple_lines')) || 3,
        threads: JSON.parse(localStorage.getItem('threads')) || navigator.hardwareConcurrency - 1,
        memory: JSON.parse(localStorage.getItem('memory')) || 32,
        think_time: (thinkTime != null) ? thinkTime : 1000,
        think_variance: (thinkVariance != null) ? thinkVariance : 500,
        move_time: (moveTime != null) ? moveTime : 500,
        move_variance: (moveVariance != null) ? moveVariance : 250,
        computer_evaluation: JSON.parse(localStorage.getItem('computer_evaluation')) || false,
        threat_analysis: JSON.parse(localStorage.getItem('threat_analysis')) || false,
        simon_says_mode: JSON.parse(localStorage.getItem('simon_says_mode')) || false,

        puzzle_mode: JSON.parse(localStorage.getItem('puzzle_mode')) || false,

        // appearance settings
        pieces: JSON.parse(localStorage.getItem('pieces')) || 'wikipedia.svg',
        board: JSON.parse(localStorage.getItem('board')) || 'brown',
        coordinates: JSON.parse(localStorage.getItem('coordinates')) || false,
    };
    push_config();

    // init chess board
    document.getElementById('board').classList.add(config.board);
    const [pieceSet, ext] = config.pieces.split('.');

    // ChessBoard.js needs a function that returns the URL for each piece
    // Safari requires chrome.runtime.getURL() for proper extension resource loading
    const getPieceUrl = (piece) => {
        return chrome.runtime.getURL(`res/chesspieces/${pieceSet}/${piece}.${ext}`);
    };

    board = ChessBoard('board', {
        position: 'start',
        pieceTheme: getPieceUrl,  // Pass function instead of template
        appearSpeed: 'fast',
        moveSpeed: 'fast',
        showNotation: config.coordinates,
        draggable: false
    });

    // init fen LRU cache
    fen_cache = new LRU(100);

    // init engine webworker
    await initialize_engine();

    // listen to messages from content-script
    chrome.runtime.onMessage.addListener(function (response) {
        if (response.fenresponse && response.dom !== 'no') {
            if (board.orientation() !== response.orient) {
                board.orientation(response.orient);
            }
            const { fen, startFen, moves } = parse_position_from_response(response.dom);
            if (last_eval.fen !== fen) {
                on_new_pos(fen, startFen, moves);
            }
        } else if (response.pullConfig) {
            push_config();
        }
    });

    // query fen periodically from content-script
    let fenRequestPending = false;
    setInterval(async function () {
        if (fenRequestPending) return;
        fenRequestPending = true;
        try {
            await request_fen();
        } finally {
            setTimeout(() => fenRequestPending = false, 100);
        }
    }, 1000); // Slow down to 1s for Safari stability

    // register button click listeners
    document.getElementById('analyze').addEventListener('click', () => {
        const variantNameMap = {
            'chess': 'standard',
            'fischerandom': 'chess960',
            'crazyhouse': 'crazyhouse',
            'kingofthehill': 'kingOfTheHill',
            '3check': 'threeCheck',
            'antichess': 'antichess',
            'atomic': 'atomic',
            'horde': 'horde',
            'racingkings': 'racingKings',
        }
        const variant = variantNameMap[config.variant];
        window.open(`https://lichess.org/analysis/${variant}?fen=${last_eval.fen}`, '_blank');
    });
    document.getElementById('config').addEventListener('click', () => {
        window.open('/src/options/options.html', '_blank');
    });

    // initialize materialize
    M.Tooltip.init(document.querySelectorAll('.tooltipped'), {});
    const modalElems = document.querySelectorAll('.modal');
    M.Modal.init(modalElems, {});

    // Helper to toggle API key field visibility
    function toggleApiKeyField() {
        const provider = document.getElementById('model-provider').value;
        document.getElementById('api-key-field').style.display = (provider === 'openai') ? 'block' : 'none';
        if (provider === 'ollama') {
            document.getElementById('base-url').value = localStorage.getItem('llm_base_url') || 'http://localhost:11434/v1';
        } else if (provider === 'openai') {
            document.getElementById('base-url').value = localStorage.getItem('llm_base_url') || 'https://api.openai.com/v1';
        }
    }

    // Load saved settings
    const savedProvider = localStorage.getItem('llm_provider') || 'ollama';
    document.getElementById('model-provider').value = savedProvider;
    document.getElementById('api-key').value = localStorage.getItem('llm_api_key') || '';
    document.getElementById('base-url').value = localStorage.getItem('llm_base_url') || 'http://localhost:11434/v1';
    document.getElementById('llm-model').value = localStorage.getItem('llm_model') || 'llama3';

    // Init form state
    // We need to re-init select for Materialize
    M.FormSelect.init(document.querySelectorAll('select'), {});
    toggleApiKeyField();

    // Event Listeners
    document.getElementById('model-provider').addEventListener('change', toggleApiKeyField);

    document.getElementById('save-settings').addEventListener('click', () => {
        localStorage.setItem('llm_provider', document.getElementById('model-provider').value);
        localStorage.setItem('llm_api_key', document.getElementById('api-key').value);
        localStorage.setItem('llm_base_url', document.getElementById('base-url').value);
        localStorage.setItem('llm_model', document.getElementById('llm-model').value);
        M.toast({ html: 'Settings Saved!', classes: 'rounded green' });
    });

    document.getElementById('config').addEventListener('click', () => {
        const instance = M.Modal.getInstance(document.getElementById('settings-modal'));
        instance.open();
    });

    // Chat Events
    document.getElementById('send-btn').addEventListener('click', sendMessageToLLM);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessageToLLM();
    });

    // Voice Coach Init
    voiceCoach = new VoiceCoach();
    voiceCoach.setTranscriptCallback((text) => {
        const input = document.getElementById('chat-input');
        input.value = text;
        sendMessageToLLM();
    });

    document.getElementById('mic-btn').addEventListener('click', () => {
        voiceCoach.toggleListen();
    });

    document.getElementById('tts-toggle').addEventListener('click', function () {
        const icon = this.querySelector('i');
        if (icon.textContent === 'volume_up') {
            icon.textContent = 'volume_off';
            window.speechSynthesis.cancel();
        } else {
            icon.textContent = 'volume_up';
        }
    });

    document.getElementById('clear-chat').addEventListener('click', () => {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '<div class="chat-message assistant">Memory cleared. Ready for new questions!</div>';
    });
});

async function initialize_engine() {
    const engineMap = {
        'stockfish-17-nnue-79': 'stockfish-17-79/sf17-79.js',
        'stockfish-16-nnue-40': 'stockfish-16-40/stockfish.js',
        'stockfish-16-nnue-7': 'stockfish-16-7/sf16-7.js',
        'lc0': 'lc0/lc0.js',
        'fairy-stockfish-14-nnue': 'fairy-stockfish-14/fsf14.js',
    }
    const enginePath = `lib/engine/${engineMap[config.engine]}`;
    const engineBasePath = enginePath.substring(0, enginePath.lastIndexOf('/'));
    if (['stockfish-16-nnue-40'].includes(config.engine)) {
        engine = new Worker(chrome.runtime.getURL(enginePath));
        engine.onmessage = (event) => on_engine_response(event.data);
    } else if (['stockfish-17-nnue-79', 'stockfish-16-nnue-7', 'fairy-stockfish-14-nnue'].includes(config.engine)) {
        const module = await import(chrome.runtime.getURL(enginePath));
        engine = await module.default();
        if (config.engine.includes('nnue')) {
            async function fetchNnueModels(engine, engineBasePath) {
                if (config.engine !== 'fairy-stockfish-14-nnue') {
                    const nnues = [];
                    for (let i = 0; ; i++) {
                        let nnue = engine.getRecommendedNnue(i);
                        if (!nnue || nnues.includes(nnue)) break;
                        nnues.push(nnue);
                    }
                    const nnue_responses = await Promise.all(nnues.map(nnue => fetch(chrome.runtime.getURL(`${engineBasePath}/${nnue}`))));
                    const buffers = await Promise.all(nnue_responses.map(res => res.arrayBuffer()));
                    return buffers.map(buf => new Uint8Array(buf));
                } else {
                    const variantNnueMap = {
                        'chess': 'nn-46832cfbead3.nnue',
                        'fischerandom': 'nn-46832cfbead3.nnue',
                        'crazyhouse': 'crazyhouse-8ebf84784ad2.nnue',
                        'kingofthehill': 'kingofthehill-978b86d0e6a4.nnue',
                        '3check': '3check-cb5f517c228b.nnue',
                        'antichess': 'antichess-dd3cbe53cd4e.nnue',
                        'atomic': 'atomic-2cf13ff256cc.nnue',
                        'horde': 'horde-28173ddccabe.nnue',
                        'racingkings': 'racingkings-636b95f085e3.nnue',
                    };
                    const variantNnue = variantNnueMap[config.variant];
                    const nnue_response = await fetch(chrome.runtime.getURL(`${engineBasePath}/nnue/${variantNnue}`));
                    return [new Uint8Array(await nnue_response.arrayBuffer())];
                }
            }

            if (config.engine === 'fairy-stockfish-14-nnue') {
                send_engine_uci(`setoption name UCI_Variant value ${config.variant}`);
            }
            const nnues = await fetchNnueModels(engine, engineBasePath);
            nnues.forEach((model, i) => engine.setNnueBuffer(model, i))
        }
        engine.listen = (message) => on_engine_response(message);
    } else if (['lc0'].includes(config.engine)) {
        const lc0Frame = document.createElement('iframe');
        lc0Frame.src = chrome.runtime.getURL(`${engineBasePath}/lc0.html`);
        lc0Frame.style.display = 'none';
        document.body.appendChild(lc0Frame);
        engine = lc0Frame.contentWindow;

        let poll_startup = true
        window.onmessage = () => poll_startup = false;
        while (poll_startup) {
            await promise_timeout(100);
        }

        window.onmessage = event => on_engine_response(event.data);
        let weights = await fetch(chrome.runtime.getURL(`${engineBasePath}/weights/weights_32195.dat.gz`)).then(res => res.arrayBuffer());
        engine.postMessage({ type: 'weights', data: { name: 'weights_32195.dat.gz', weights: new Uint8Array(weights) } }, '*');
    }

    if (config.engine === 'remote') {
        console.log('[Engine] Using REMOTE engine - no local initialization needed');
        console.log('[Engine] Backend URL: http://localhost:9090');
        console.log('[Engine] Ready to analyze positions!');
    } else {
        // Local engine initialization (skipped for Safari/remote)
        console.log('[Engine] Local engine not supported in Safari - use remote instead');
    }
    console.log('Engine ready!', config.engine);
}

function send_engine_uci(message) {
    if (config.engine === 'lc0') {
        engine.postMessage(message, '*');
    } else if (engine instanceof Worker) {
        engine.postMessage(message);
    } else if (engine && 'uci' in engine) {
        engine.uci(message);
    }
}

function on_engine_best_move(best, threat, isTerminal = false) {
    if (config.engine === 'remote') {
        last_eval.activeLines = last_eval.lines.length;
    }

    console.log('EVALUATION:', JSON.parse(JSON.stringify(last_eval)));
    const piece_name_map = { P: 'Pawn', R: 'Rook', N: 'Knight', B: 'Bishop', Q: 'Queen', K: 'King' };
    const toplay = (turn === 'w') ? 'White' : 'Black';
    const next = (turn === 'w') ? 'Black' : 'White';
    if (best === '(none)') {
        const pvLine = last_eval.lines[0] || '';
        if ('mate' in pvLine) {
            update_evaluation('Checkmate!');
            if (config.variant === 'antichess') {
                update_best_move(`${toplay} Wins`, '');
            } else {
                update_best_move(`${next} Wins`, '');
            }
        } else {
            update_evaluation('Stalemate!');
            if (config.variant === 'antichess') {
                update_best_move(`${toplay} Wins`, '');
            } else {
                update_best_move('Draw', '');
            }
        }
    } else if (config.simon_says_mode) {
        if (toplay.toLowerCase() === board.orientation()) {
            const startSquare = best.substring(0, 2);
            const startPiece = board.position()[startSquare];
            const startPieceType = (startPiece) ? startPiece.substring(1) : null;
            if (startPieceType) {
                update_best_move(piece_name_map[startPieceType]);
            }
        } else {
            update_best_move('');
        }
    } else {
        if (threat && threat !== '(none)') {
            update_best_move(`${toplay} to play, best move is ${best}`, `Best response for ${next} is ${threat}`);
        } else {
            update_best_move(`${toplay} to play, best move is ${best}`, '');
        }
    }

    if (toplay.toLowerCase() === board.orientation()) {
        last_eval.bestmove = best;
        last_eval.threat = threat;
        if (config.simon_says_mode) {
            const startSquare = best.substring(0, 2);
            if (board.position()[startSquare] == null) {
                // The current best move is stale so abort! This happens when the opponent makes a move in
                // the middle of continuous evaluation: the engine isn't done evaluating the opponent's
                // position and ends up returning the opponent's best move on our turn.
                return;
            }
            const startPiece = board.position()[startSquare].substring(1);
            if (last_eval.lines[0] != null) {
                if ('mate' in last_eval.lines[0]) {
                    request_console_log(`${piece_name_map[startPiece]} ==> #${last_eval.lines[0].mate}`);
                } else {
                    request_console_log(`${piece_name_map[startPiece]} ==> ${last_eval.lines[0].score / 100.0}`);
                }
            }
            if (config.threat_analysis) {
                clear_annotations();
                draw_threat();
            }
        }

    }

    if (!config.simon_says_mode) {
        draw_moves();
        if (config.threat_analysis) {
            draw_threat()
        }
    }

    toggle_calculating(false);
}

function on_engine_evaluation(info) {
    if (!info.lines[0]) return;

    if ('mate' in info.lines[0]) {
        update_evaluation(`Checkmate in ${info.lines[0].mate}`);
    } else {
        update_evaluation(`Score: ${info.lines[0].score / 100.0} at depth ${info.lines[0].depth}`)
    }
}

function on_engine_response(message) {
    console.log('on_engine_response', message);
    if (config.engine === 'remote') {
        last_eval = Object.assign(last_eval, message);
        on_engine_evaluation(last_eval);
        on_engine_best_move(last_eval.bestmove, last_eval.threat, true);
        return;
    }

    if (message.includes('lowerbound') || message.includes('upperbound') || message.includes('currmove')) {
        return; // ignore these messages
    } else if (message.startsWith('bestmove')) {
        const arr = message.split(' ');
        const best = arr[1];
        const threat = arr[3];
        on_engine_best_move(best, threat, true);
    } else if (message.startsWith('info depth')) {
        const lineInfo = {};
        const tokens = message.split(' ').slice(1);
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token === 'score') {
                lineInfo.rawScore = `${tokens[i + 1]} ${tokens[i + 2]}`;
                i += 2; // take 2 tokens
            } else if (token === 'pv') {
                lineInfo['move'] = tokens[i + 1];
                lineInfo[token] = tokens.slice(i + 1).join(' '); // take rest of tokens
                break;
            } else {
                const num = parseInt(tokens[i + 1]);
                lineInfo[token] = isNaN(num) ? tokens[i + 1] : num;
                i++; // take 1 token
            }
        }

        const scoreNumber = Number(lineInfo.rawScore.substring(lineInfo.rawScore.indexOf(' ') + 1));
        const scoreType = lineInfo.rawScore.includes('cp') ? 'score' : 'mate';
        lineInfo[scoreType] = (turn === 'w' ? 1 : -1) * scoreNumber;

        const pvIdx = (lineInfo.multipv - 1) || 0;
        last_eval.activeLines = Math.max(last_eval.activeLines, lineInfo.multipv);
        if (pvIdx === 0) {
            // continuously show the best move for each depth
            if (last_eval.lines[0] != null) {
                const arr = last_eval.lines[0].pv.split(' ');
                const best = arr[0];
                const threat = arr[1];
                on_engine_best_move(best, threat);
            }
            // reset lines
            last_eval.lines = new Array(config.multiple_lines);
            // trigger an evaluation update
            last_eval.lines[pvIdx] = lineInfo;
            on_engine_evaluation(last_eval);
        } else {
            last_eval.lines[pvIdx] = lineInfo;
        }
    }

    if (is_calculating) {
        prog++;
        let progMapping = 100 * (1 - Math.exp(-prog / 30));
        document.getElementById('progBar')?.setAttribute('value', `${Math.round(progMapping)}`);
    }
}

function on_new_pos(fen, startFen, moves) {
    console.log("on_new_pos", fen, startFen, moves);
    toggle_calculating(true);
    if (config.engine === 'remote') {
        if (moves) {
            request_remote_analysis(startFen, config.compute_time, moves).then(on_engine_response);
        } else {
            request_remote_analysis(fen, config.compute_time).then(on_engine_response);
        }
    } else {
        send_engine_uci('stop');
        if (moves) {
            send_engine_uci(`position fen ${startFen} moves ${moves}`);
        } else {
            send_engine_uci(`position fen ${fen}`);
        }
        send_engine_uci(`go movetime ${config.compute_time}`);
    }

    board.position(fen);
    clear_annotations();
    if (config.simon_says_mode) {
        const toplay = (turn === 'w') ? 'White' : 'Black';
        if (toplay.toLowerCase() !== board.orientation()) {
            draw_moves();
            request_console_log('Best Move: ' + last_eval.bestmove);
        }
    }
    last_eval = { fen, activeLines: 0, lines: new Array(config.multiple_lines) }; // new evaluation
}

function parse_position_from_response(txt) {
    const prefixMap = {
        li: 'Game detected on Lichess.org',
        cc: 'Game detected on Chess.com',
        bt: 'Game detected on BlitzTactics.com'
    };

    function parse_position_from_moves(txt, startFen = null) {
        const directKey = (startFen) ? `${startFen}_${txt}` : txt;
        const directHit = fen_cache.get(directKey);
        if (directHit) { // reuse position
            console.log('DIRECT');
            turn = directHit.fen.charAt(directHit.fen.indexOf(' ') + 1);
            return directHit;
        }

        let record;
        const lastMoveRegex = /([\w-+=#]+[*]+)$/;
        const indirectKey = directKey.replace(lastMoveRegex, '');
        const indirectHit = fen_cache.get(indirectKey);
        if (indirectHit) { // append newest move
            console.log('INDIRECT');
            const chess = new Chess(config.variant, indirectHit.fen);
            const moveReceipt = chess.move(txt.match(lastMoveRegex)[0].split('*****')[0]);
            turn = chess.turn();
            record = { fen: chess.fen(), startFen: indirectHit.startFen, moves: indirectHit.moves + ' ' + moveReceipt.lan }
        } else { // perform all moves
            console.log('FULL');
            const chess = new Chess(config.variant, startFen);
            const sans = txt.split('*****').slice(0, -1);
            let moves = '';
            for (const san of sans) {
                const moveReceipt = chess.move(san);
                moves += moveReceipt.lan + ' ';
            }
            turn = chess.turn();
            record = { fen: chess.fen(), startFen: chess.startFen(), moves: moves.trim() };
        }

        fen_cache.set(directKey, record);
        return record;
    }

    function parse_position_from_pieces(txt) {
        const directHit = fen_cache.get(txt);
        if (directHit) { // reuse position
            console.log('DIRECT');
            turn = directHit.fen.charAt(directHit.fen.indexOf(' ') + 1);
            return directHit;
        }

        console.log('FULL');
        const chess = new Chess(config.variant);
        chess.clear(); // clear the board so we can place our pieces
        const [playerTurn, ...pieces] = txt.split('*****').slice(0, -1);
        for (const piece of pieces) {
            const attributes = piece.split('-');
            chess.put({ type: attributes[1], color: attributes[0] }, attributes[2]);
        }
        chess.setTurn(playerTurn);
        turn = chess.turn();

        const record = { fen: chess.fen() };
        fen_cache.set(txt, record);
        return record;
    }

    const metaTag = txt.substring(3, 8);
    const prefix = metaTag.substring(0, 2);
    document.getElementById('game-detection').innerText = prefixMap[prefix];
    txt = txt.substring(11);

    if (metaTag.includes('var')) {
        if (config.variant === 'fischerandom') {
            const puzTxt = txt.substring(0, txt.indexOf('&'));
            const fenTxt = txt.substring(txt.indexOf('&') + 6);
            const startFen = parse_position_from_pieces(puzTxt).fen.replace('-', 'KQkq');
            return parse_position_from_moves(fenTxt, startFen);
        }
        return parse_position_from_moves(txt);
    } else if (metaTag.includes('puz')) { // chess.com & blitztactics.com puzzle pages
        return parse_position_from_pieces(txt);
    } else { // chess.com and lichess.org pages
        return parse_position_from_moves(txt);
    }
}

function update_evaluation(eval_string) {
    if (eval_string != null && config.computer_evaluation) {
        document.getElementById('evaluation').innerHTML = eval_string;
    }
}

function update_best_move(line1, line2) {
    if (line1 != null) {
        document.getElementById('chess_line_1').innerHTML = line1;
    }
    if (line2 != null) {
        document.getElementById('chess_line_2').innerHTML = line2;
    }
}

function request_fen() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { queryfen: true });
    });
}



function request_console_log(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { consoleMessage: message });
    });
}

function push_config() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { pushConfig: true, config: config });
    });
}

function draw_moves() {
    if (last_eval.lines[0] == null) return;

    function strokeFunc(line) {
        const MATE_SCORE = 20;
        const WINNING_THRESHOLD = 4;
        const MAX_STROKE = 0.225, MIN_STROKE = 0.075;
        const STROKE_SHIM = 0.0125;

        const top_line = last_eval.lines[0];
        const top_score = (turn === 'w' ? 1 : -1) * top_line.score / 100;
        const score = (turn === 'w' ? 1 : -1) * line.score / 100;
        if (top_line.move === line.move) { // is best move?
            console.log(`0 => ${MAX_STROKE + 2 * STROKE_SHIM}`);
            return MAX_STROKE + 2 * STROKE_SHIM; // accentuate the best move
        } else if (isNaN(top_score) || top_score >= WINNING_THRESHOLD) { // is winning?
            if (isNaN(score)) {
                console.log(`winning: #${line.mate} => ${MAX_STROKE - STROKE_SHIM}`);
                return MAX_STROKE - STROKE_SHIM; // moves that checkmate are necessarily good
            } else if (score < WINNING_THRESHOLD) {
                console.log(`winning: ${score} => losing`);
                return 0; // hide moves that are not winning
            } else {
                const delta = (isNaN(top_score) ? MATE_SCORE : top_score) - score;
                console.log(`winning: ${score} => ok ${delta}`);
                if (delta <= 0) {
                    return MAX_STROKE - 2 * STROKE_SHIM; // moves that are still winning are good
                } else {
                    const stroke = MAX_STROKE - 2 * STROKE_SHIM - delta / 150;
                    return Math.min(MAX_STROKE, Math.max(MIN_STROKE, stroke));
                }
            }
        } else { // is roughly equal?
            const delta = top_score - score;
            if (isNaN(score) || delta >= WINNING_THRESHOLD) {
                console.log(`${delta} => 0`);
                return 0; // hide moves that are too losing or get us checkmated
            } else {
                const stroke = MAX_STROKE - delta / 15;
                console.log(`${delta} => ${stroke}`);
                return Math.min(MAX_STROKE, Math.max(MIN_STROKE, stroke))
            }
        }
    }

    clear_annotations();
    for (let i = 0; i < last_eval.activeLines; i++) {
        if (!last_eval.lines[i]) continue;

        const arrow_color = (i === 0) ? '#004db8' : '#4a4a4a';
        const stroke_width = strokeFunc(last_eval.lines[i]);
        draw_move(last_eval.lines[i].move, arrow_color, document.getElementById('move-annotations'), stroke_width);
    }
    updateTopMovesUI();
}

function draw_threat() {
    if (last_eval.threat) {
        draw_move(last_eval.threat, '#bf0000', document.getElementById('response-annotations'));
    }
}

function draw_move(move, color, overlay, stroke_width = 0.225) {
    if (!move || move === '(none)') {
        overlay.lastElementChild?.remove();
        return; // hide overlay on win/loss
    } else if (stroke_width === 0) {
        return; // hide losing moves
    }

    function get_coord(square) {
        const x = square[0].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
        const y = parseInt(square[1]);
        return (board.orientation() === 'white') ? { x, y } : { x: 9 - x, y: 9 - y };
    }

    function get_coords(move) {
        const { x: x0, y: y0 } = get_coord(move.substring(0, 2));
        const { x: x1, y: y1 } = get_coord(move.substring(2, 4));
        return { x0, y0, x1, y1 }
    }

    if (move.includes('@')) {
        const coord = get_coord(move.substring(2, 4));
        const x = 0.5 + (coord.x - 1);
        const y = 8 - (0.5 + (coord.y - 1));
        const imgX = 43 * (coord.x - 1);
        const imgY = 43 * (8 - coord.y);

        const MAX_STROKE = 0.25;
        stroke_width = 0.1 * stroke_width / MAX_STROKE;
        const stroke_diff = (MAX_STROKE - stroke_width) / 10;
        console.log("STROKE_DIFF:", MAX_STROKE, "-", stroke_width, "=", stroke_diff);

        const pieceIdentifier = turn + move[0];
        const [pieceSet, ext] = config.pieces.split('.');
        const piecePath = `/res/chesspieces/${pieceSet}/${pieceIdentifier}.${ext}`
        overlay.innerHTML += `
            <img style='position: absolute; z-index: -1; left: ${imgX}px; top: ${imgY}px; opacity: 0.4;' width='43px'
                height='43px' src='${piecePath}' alt='${pieceIdentifier}'>
            <svg style='position: absolute; z-index: -1; left: 0; top: 0;' width='344px' height='344px' viewBox='0, 0, 8, 8'>
                <circle cx='${x}' cy='${y}' r='${0.45 + stroke_diff}' fill='transparent' opacity='0.4' stroke='${color}' stroke-width='${stroke_width}' />
            </svg>
        `;
    } else {
        const coords = get_coords(move);
        const x0 = 0.5 + (coords.x0 - 1);
        const y0 = 8 - (0.5 + (coords.y0 - 1));
        const x1 = 0.5 + (coords.x1 - 1);
        const y1 = 8 - (0.5 + (coords.y1 - 1));

        const dx = x1 - x0;
        const dy = y1 - y0;
        const d = Math.sqrt(dx * dx + dy * dy);
        const ax0 = x0 + 0.1 * ((x1 - x0) / d);
        const ay0 = y0 + 0.1 * (dy / d);
        const ax1 = x1 - 0.4 * ((x1 - x0) / d);
        const ay1 = y1 - 0.4 * (dy / d);

        const marker_id = color.replace(/[ ,()]/g, '-');
        overlay.innerHTML += `
            <svg style='position: absolute; z-index: -1; left: 0; top: 0;' width='344px' height='344px' viewBox='0, 0, 8, 8'>
                <defs>
                    <marker id='arrow-${marker_id}' markerWidth='13' markerHeight='13' refX='1' refY='7' orient='auto'>
                        <path d='M1,5.75 L3,7 L1,8.25' fill='${color}' />
                    </marker>
                </defs>
                <line x1='${ax0}' y1='${ay0}' x2='${ax1}' y2='${ay1}' stroke='${color}' fill=${color}' opacity='0.4'
                    stroke-width='${stroke_width}' marker-end='url(#arrow-${marker_id})'/>
            </svg>
        `;

        if (move.length === 5) {
            const imgX = 43 * (coords.x1 - 1);
            const imgY = 43 * (8 - coords.y1);
            const pieceIdentifier = turn + move[4];
            const [pieceSet, ext] = config.pieces.split('.');
            const piecePath = `/res/chesspieces/${pieceSet}/${pieceIdentifier}.${ext}`;
            overlay.innerHTML += `
                <img style='position: absolute; z-index: -1; left: ${imgX}px; top: ${imgY}px; opacity: 0.4;' width='43px'
                    height='43px' src='${piecePath}' alt='${pieceIdentifier}'>
            `;
        }
    }
}

function clear_annotations() {
    let move_annotation = document.getElementById('move-annotations');
    while (move_annotation.childElementCount) {
        move_annotation.lastElementChild.remove();
    }
    let response_annotation = document.getElementById('response-annotations');
    while (response_annotation.childElementCount) {
        response_annotation.lastElementChild.remove();
    }
}

function toggle_calculating(on) {
    prog = 0;
    is_calculating = on;
    if (is_calculating) {
        update_best_move(`<div>Calculating...<div><progress id='progBar' value='2' max='100'>`, '');
    }
}



// -------------------------------------------------------------------------------------------
// LLM Chat Logic
// -------------------------------------------------------------------------------------------

function updateTopMovesUI() {
    const container = document.getElementById('moves-chips-container');
    if (!container || !last_eval || !last_eval.lines) return;

    let html = '';
    for (let i = 0; i < last_eval.lines.length; i++) {
        const line = last_eval.lines[i];
        if (!line || !line.move) continue;

        const score = (turn === 'w' ? 1 : -1) * line.score / 100;
        const scoreText = (line.mate) ? `#${line.mate}` : (score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2));
        const moveText = line.move;

        html += `<div class="move-chip" onclick="document.getElementById('chat-input').value = 'Why is ${moveText} good?'; document.getElementById('chat-input').focus();">
            ${moveText} <span style="font-size:10px; opacity:0.6;">(${scoreText})</span>
        </div>`;
    }
    container.innerHTML = html;
}

async function sendMessageToLLM() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    input.value = '';

    const fen = last_eval.fen;
    let analysisContext = "Stockfish Analysis:\n";
    if (last_eval.lines) {
        last_eval.lines.forEach((line, i) => {
            if (line && line.move) {
                const score = (turn === 'w' ? 1 : -1) * line.score / 100;
                const scoreText = (line.mate) ? `Mate #${line.mate}` : `CP: ${score.toFixed(2)}`;
                analysisContext += `Line ${i + 1}: ${line.move} (${scoreText})\n`;
            }
        });
    }

    const systemPrompt = `You are ChessSight, a Grandmaster Chess Coach. 
    Current FEN: ${fen}
    ${analysisContext}
    Provide insightful, concise advice. Use Markdown for bolding key moves or concepts.`;

    const provider = localStorage.getItem('llm_provider') || 'ollama';
    const baseUrl = localStorage.getItem('llm_base_url') || 'http://localhost:11434/v1';
    const apiKey = localStorage.getItem('llm_api_key') || '';
    const llmModel = localStorage.getItem('llm_model') || (provider === 'openai' ? 'gpt-4o' : 'llama3');

    const loadingId = appendMessage('', 'assistant', true);
    let fullReply = "";

    try {
        const port = chrome.runtime.connect({ name: "llm_stream" });

        port.onMessage.addListener((msg) => {
            if (msg.type === 'chunk') {
                fullReply += msg.content;
                updateMessage(loadingId, renderMarkdown(fullReply));
            } else if (msg.type === 'done') {
                port.disconnect();
                if (voiceCoach) voiceCoach.speak(fullReply);
            } else if (msg.type === 'error') {
                updateMessage(loadingId, `Error: ${msg.error}`);
                port.disconnect();
            }
        });

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        port.postMessage({
            type: 'llm_request',
            url: `${baseUrl}/chat/completions`,
            headers: headers,
            body: {
                model: llmModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ]
            }
        });

    } catch (e) {
        console.error(e);
        const errorMessage = `System Error: ${e.message}`;
        updateMessage(loadingId, errorMessage);

        // Voice Output for system error
        if (voiceCoach) {
            voiceCoach.speak(errorMessage);
        }
    }
}

function renderMarkdown(text) {
    // Simple regex-based markdown
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function appendMessage(text, role, isLoading = false) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}`;
    msgDiv.innerHTML = text;
    if (isLoading) msgDiv.id = 'msg-loading-' + Date.now();
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgDiv.id;
}

function updateMessage(id, html) {
    const msgDiv = document.getElementById(id);
    if (msgDiv) {
        msgDiv.innerHTML = html;
        // Re-scroll
        const container = document.getElementById('chat-messages');
        container.scrollTop = container.scrollHeight;
    }
}

// Hook up events
// We do this inside DOMContentLoaded or here if type=module. 
// Since popup.js is type="module", this code runs immediately but might miss elements if not loaded.
// Better to attach inside DOMContentLoaded. 
// The DOMContentLoaded listener is at the top of the file. 
// I will just attach functions to window or re-select elements.
// Actually, I should proactively attach them in the DOMContentLoaded block.




async function request_remote_configure(options) {
    // Configuration not needed for new API - Stockfish is pre-configured
    console.log('[Remote] Engine configuration:', options);
    return Promise.resolve({ status: 'ok' });
}

async function request_remote_analysis(fen, time, moves = null) {
    try {
        const response = await call_backend('http://localhost:9090/analyze', {
            fen: fen,
            movetime: time,
            multipv: config.multiple_lines || 3
        });

        const data = await response.json();

        // Convert from new API format to engine response format
        return {
            bestmove: data.bestmove,
            threat: '(none)',  // Not supported yet
            fen: fen,
            activeLines: data.lines.length,
            lines: data.lines
        };
    } catch (error) {
        console.error('[Remote] Analysis failed:', error);
        return {
            bestmove: '(none)',
            threat: '(none)',
            fen: fen,
            activeLines: 0,
            lines: []
        };
    }
}

async function call_backend(url, data) {
    return fetch(url, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

function promise_timeout(time) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(time), time);
    });
}
