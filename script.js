// ===================================================
// CYBER NEON TIC TAC TOE - COMPLETE GAME ENGINE
// SVG Vectors, Web Audio Synthesizer, AI Bot, Haptic Feedback
// ===================================================

// --- DOM References ---
const boxes = document.querySelectorAll(".box");
const boardWrapper = document.querySelector(".board-wrapper");
const resetBtn = document.querySelector("#reset-btn");
const newGameBtn = document.querySelector("#new-btn");

const msgContainer = document.querySelector("#msg-container");
const msg = document.querySelector("#msg");
const resultText = document.querySelector("#result-text");
const resultIcon = document.querySelector("#result-icon");
const inspectBtn = document.querySelector("#inspect-btn");
const viewResultBtn = document.querySelector("#view-result-btn");

const turnIndicator = document.querySelector("#turn-indicator");
const turnText = document.querySelector("#turn-text");

const cardO = document.querySelector("#card-o");
const cardX = document.querySelector("#card-x");
const cardDraw = document.querySelector("#card-draw");

const playerXName = document.querySelector("#player-x-name");

const scoreO = document.querySelector("#score-o");
const scoreX = document.querySelector("#score-x");
const scoreDraw = document.querySelector("#score-draw");

const strikeLine = document.querySelector("#strike-line");
const confettiCanvas = document.querySelector("#confetti-canvas");

const modePvPBtn = document.querySelector("#mode-pvp");
const modeAiBtn = document.querySelector("#mode-ai");

const soundBtn = document.querySelector("#sound-btn");
const soundIconOn = document.querySelector("#sound-icon-on");
const soundIconOff = document.querySelector("#sound-icon-off");

// --- SVG Vector Icons ---
const SVG_O = `
<svg class="symbol-svg symbol-o" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="33" stroke="currentColor" stroke-width="11" fill="none" stroke-linecap="round" />
</svg>
`;

const SVG_X = `
<svg class="symbol-svg symbol-x" viewBox="0 0 100 100">
    <line x1="24" y1="24" x2="76" y2="76" stroke="currentColor" stroke-width="11" stroke-linecap="round" />
    <line x1="76" y1="24" x2="24" y2="76" stroke="currentColor" stroke-width="11" stroke-linecap="round" />
</svg>
`;

// --- Game State ---
let boardState = Array(9).fill(null);
let turnO = true;
let gameOver = false;
let isBotThinking = false;
let lastMoveIndex = null;
let winSequenceTimeouts = [];
let currentMode = "pvp"; // "pvp" | "ai"

const score = {
    O: 0,
    X: 0,
    draw: 0
};

function clearWinTimeouts() {
    winSequenceTimeouts.forEach(t => clearTimeout(t));
    winSequenceTimeouts = [];
}

// --- Winning Combinations & Laser Line Classes ---
const winPatterns = [
    { indices: [0, 1, 2], strikeClass: "strike-row-0" },
    { indices: [3, 4, 5], strikeClass: "strike-row-1" },
    { indices: [6, 7, 8], strikeClass: "strike-row-2" },
    { indices: [0, 3, 6], strikeClass: "strike-col-0" },
    { indices: [1, 4, 7], strikeClass: "strike-col-1" },
    { indices: [2, 5, 8], strikeClass: "strike-col-2" },
    { indices: [0, 4, 8], strikeClass: "strike-diag-main" },
    { indices: [2, 4, 6], strikeClass: "strike-diag-anti" }
];

// ===================================================
// WEB AUDIO SYNTHESIZER & HAPTICS
// ===================================================
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

// Pre-unlock Web Audio eagerly on the very first touch/click anywhere
function unlockAudio() {
    initAudio();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("click", unlockAudio);
}
window.addEventListener("pointerdown", unlockAudio, { passive: true });
window.addEventListener("touchstart", unlockAudio, { passive: true });
window.addEventListener("click", unlockAudio, { passive: true });

function triggerHaptic(pattern) {
    if ("vibrate" in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {}
    }
}

function playMoveSound(isO) {
    if (!soundEnabled) return;
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = isO ? "sine" : "triangle";
        const startFreq = isO ? 520 : 380;
        const endFreq = isO ? 680 : 310;
        osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
}

function playWinSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        // Warm celebratory arpeggio: C5, E5, G5, C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            const startTime = audioCtx.currentTime + idx * 0.09;
            gain.gain.setValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.35);
        });
    } catch (e) {}
}

function playDrawSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const notes = [440, 392, 349.23];
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            const startTime = audioCtx.currentTime + idx * 0.1;
            gain.gain.setValueAtTime(0.08, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.18);
        });
    } catch (e) {}
}

// ===================================================
// TURN & SCOREBOARD DISPLAY
// ===================================================
function updateTurnIndicator() {
    if (gameOver) return;

    if (turnO) {
        turnText.innerText = currentMode === "ai" ? "Your Turn (O)" : "Player O's Turn";
        turnIndicator.className = "turn-indicator turn-o";
        if (boardWrapper) boardWrapper.className = "board-wrapper turn-o";
        cardO?.classList.add("active-turn");
        cardX?.classList.remove("active-turn");
    } else {
        if (currentMode === "ai") {
            turnText.innerText = "Bot Thinking...";
            turnIndicator.className = "turn-indicator turn-x thinking";
            if (boardWrapper) boardWrapper.className = "board-wrapper";
        } else {
            turnText.innerText = "Player X's Turn";
            turnIndicator.className = "turn-indicator turn-x";
            if (boardWrapper) boardWrapper.className = "board-wrapper turn-x";
        }
        cardX?.classList.add("active-turn");
        cardO?.classList.remove("active-turn");
    }
}

// ===================================================
// MOVE LOGIC
// ===================================================
function makeMove(index, symbol) {
    boardState[index] = symbol;
    boxes[index].innerHTML = symbol === "O" ? SVG_O : SVG_X;
    boxes[index].disabled = true;

    // Highlight last move indicator
    if (lastMoveIndex !== null && boxes[lastMoveIndex]) {
        boxes[lastMoveIndex].classList.remove("last-move", "last-o", "last-x");
    }
    lastMoveIndex = index;
    boxes[index].classList.add("last-move", symbol === "O" ? "last-o" : "last-x");

    triggerHaptic(28);
    playMoveSound(symbol === "O");

    const winningMatch = checkWinCondition();
    if (winningMatch) {
        handleWin(symbol, winningMatch);
        return;
    }

    if (checkDrawCondition()) {
        handleDraw();
        return;
    }

    // Next turn
    turnO = !turnO;
    updateTurnIndicator();

    // If vs AI and it's X's turn, trigger realistic paced bot move
    if (currentMode === "ai" && !turnO && !gameOver) {
        triggerBotMove();
    }
}

// User box click / touch
boxes.forEach((box) => {
    box.addEventListener("click", (e) => {
        e.preventDefault();
        const index = parseInt(box.getAttribute("data-index"), 10);

        if (gameOver || isBotThinking || boardState[index] !== null) return;

        const currentSymbol = turnO ? "O" : "X";
        makeMove(index, currentSymbol);
    });
});

// ===================================================
// SMART AI BOT MOVE (Balanced Mobile-Optimized Speed)
// ===================================================
function triggerBotMove() {
    isBotThinking = true;

    // Balanced speed: 380ms - 460ms
    // Snappy yet gives clear visual feedback of player's move
    const thinkingDelay = Math.floor(Math.random() * 80) + 380;
    setTimeout(() => {
        if (gameOver) {
            isBotThinking = false;
            return;
        }

        const bestIndex = getBestBotMove();
        if (bestIndex !== -1) {
            makeMove(bestIndex, "X");
        }

        isBotThinking = false;
    }, thinkingDelay);
}

function getBestBotMove() {
    // 1. Check if Bot can win in 1 move
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern.indices;
        const line = [boardState[a], boardState[b], boardState[c]];
        if (line.filter(v => v === "X").length === 2 && line.includes(null)) {
            return pattern.indices[line.indexOf(null)];
        }
    }

    // 2. Check if Bot needs to block Player O
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern.indices;
        const line = [boardState[a], boardState[b], boardState[c]];
        if (line.filter(v => v === "O").length === 2 && line.includes(null)) {
            return pattern.indices[line.indexOf(null)];
        }
    }

    // 3. Take center if available
    if (boardState[4] === null) return 4;

    // 4. Take corners
    const corners = [0, 2, 6, 8].filter(i => boardState[i] === null);
    if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)];
    }

    // 5. Take any remaining spot
    const emptyIndices = boardState
        .map((val, idx) => (val === null ? idx : null))
        .filter(val => val !== null);

    return emptyIndices.length > 0 ? emptyIndices[0] : -1;
}

// ===================================================
// WIN / DRAW EVALUATION
// ===================================================
function checkWinCondition() {
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern.indices;
        if (
            boardState[a] &&
            boardState[a] === boardState[b] &&
            boardState[b] === boardState[c]
        ) {
            return pattern;
        }
    }
    return null;
}

function checkDrawCondition() {
    return boardState.every(cell => cell !== null);
}

function handleWin(winner, winningPattern) {
    gameOver = true;
    isBotThinking = false;
    clearWinTimeouts();

    if (winner === "O") {
        score.O++;
        scoreO.innerText = score.O;
    } else {
        score.X++;
        scoreX.innerText = score.X;
    }

    turnText.innerText = currentMode === "ai"
        ? (winner === "O" ? "VICTORY! (O WINS)" : "BOT WINS!")
        : `PLAYER ${winner} WINS!`;

    // Stage 1 (80ms): Winning trio lights up & laser strike line cuts across
    const t1 = setTimeout(() => {
        winningPattern.indices.forEach((idx) => {
            boxes[idx].classList.add("winner");
        });

        strikeLine.className = `strike-line ${winningPattern.strikeClass}`;
        strikeLine.style.color = winner === "O" ? "var(--neon-cyan)" : "var(--neon-magenta)";
        strikeLine.classList.remove("hide");

        triggerHaptic([60, 50, 120]);
        playWinSound();
    }, 80);
    winSequenceTimeouts.push(t1);

    // Stage 2 (220ms): Celebration confetti burst
    const t2 = setTimeout(() => {
        if (!gameOver) return;
        createConfetti();
    }, 220);
    winSequenceTimeouts.push(t2);

    // Stage 3 (680ms): Victory modal slides up smoothly
    // Balanced speed: gives enough time to see the winning line without making player wait
    const t3 = setTimeout(() => {
        if (!gameOver) return;
        if (resultIcon) resultIcon.innerText = "🏆";
        if (currentMode === "ai") {
            msg.innerText = winner === "O" ? "You Won!" : "Bot Won!";
            resultText.innerText = winner === "O" 
                ? "Spectacular gameplay! You outsmarted the AI." 
                : "Tough match! Try again to claim victory.";
        } else {
            msg.innerText = `Player ${winner} Wins!`;
            resultText.innerText = "Flawless victory! Superior strategy.";
        }
        msgContainer.classList.remove("hide");
    }, 680);
    winSequenceTimeouts.push(t3);
}

function handleDraw() {
    gameOver = true;
    isBotThinking = false;
    clearWinTimeouts();
    score.draw++;
    scoreDraw.innerText = score.draw;
    turnText.innerText = "STALEMATE (DRAW)!";

    triggerHaptic(60);
    playDrawSound();

    // Balanced delay for draw (520ms)
    const t = setTimeout(() => {
        if (!gameOver) return;
        if (resultIcon) resultIcon.innerText = "🤝";
        msg.innerText = "Stalemate (Draw)!";
        resultText.innerText = "Evenly matched battle. No moves left.";
        msgContainer.classList.remove("hide");
    }, 520);
    winSequenceTimeouts.push(t);
}

// ===================================================
// RESET & NEW GAME
// ===================================================
function resetBoard() {
    triggerHaptic(20);
    clearWinTimeouts();
    boardState = Array(9).fill(null);
    turnO = true;
    gameOver = false;
    isBotThinking = false;
    lastMoveIndex = null;

    boxes.forEach((box) => {
        box.disabled = false;
        box.innerHTML = "";
        box.classList.remove("winner", "last-move", "last-o", "last-x");
    });

    strikeLine.className = "strike-line hide";
    msgContainer.classList.add("hide");
    if (viewResultBtn) viewResultBtn.classList.add("hide");

    updateTurnIndicator();
    clearConfetti();
}

function fullResetScores() {
    score.O = 0;
    score.X = 0;
    score.draw = 0;

    scoreO.innerText = "0";
    scoreX.innerText = "0";
    scoreDraw.innerText = "0";

    resetBoard();
}

// ===================================================
// MODE SELECTION
// ===================================================
function setMode(mode) {
    if (currentMode === mode) return;
    currentMode = mode;
    triggerHaptic(25);

    if (mode === "ai") {
        modeAiBtn.classList.add("active");
        modePvPBtn.classList.remove("active");
        playerXName.innerText = "BOT (AI)";
    } else {
        modePvPBtn.classList.add("active");
        modeAiBtn.classList.remove("active");
        playerXName.innerText = "PLAYER X";
    }

    fullResetScores();
}

// ===================================================
// AUDIO TOGGLE
// ===================================================
function toggleSound() {
    soundEnabled = !soundEnabled;
    triggerHaptic(20);

    if (soundEnabled) {
        soundIconOn.classList.remove("hide");
        soundIconOff.classList.add("hide");
    } else {
        soundIconOn.classList.add("hide");
        soundIconOff.classList.remove("hide");
    }
}

// ===================================================
// ULTRA-FAST HIGH-VELOCITY CELEBRATION ENGINE
// Snappy, energetic, fast-gravity, explosive multi-burst
// ===================================================
let confettiTimeouts = [];
let fallbackAnimId = null;

function createConfetti() {
    clearConfetti();

    const colors = ["#00f2fe", "#f72585", "#fbbf24", "#38bdf8", "#c084fc", "#ffffff"];

    // 1. If Canvas-Confetti library is available: Ultra-fast, high velocity, snappy duration
    if (typeof confetti === "function") {
        // Blast 1: Instant high-velocity center firework (startVelocity: 68, gravity: 1.45, ticks: 120)
        confetti({
            particleCount: 85,
            spread: 95,
            origin: { y: 0.62 },
            colors: colors,
            startVelocity: 68,
            gravity: 1.45,
            ticks: 120,
            scalar: 1.15
        });

        // Blast 2: Fast cross-firing dual cannons at 70ms
        const t1 = setTimeout(() => {
            if (!gameOver) return;
            // Left Cannon - high speed
            confetti({
                particleCount: 45,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.75 },
                colors: colors,
                startVelocity: 68,
                gravity: 1.45,
                ticks: 110
            });
            // Right Cannon - high speed
            confetti({
                particleCount: 45,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.75 },
                colors: colors,
                startVelocity: 68,
                gravity: 1.45,
                ticks: 110
            });
        }, 70);
        confettiTimeouts.push(t1);

        // Blast 3: Final rapid celebratory pop at 180ms
        const t2 = setTimeout(() => {
            if (!gameOver) return;
            confetti({
                particleCount: 50,
                spread: 120,
                origin: { y: 0.52 },
                colors: colors,
                startVelocity: 55,
                gravity: 1.5,
                ticks: 100
            });
        }, 180);
        confettiTimeouts.push(t2);

        return;
    }

    // 2. High-Performance Zero-Lag Native Canvas Fallback (Super Fast Physics)
    runFastCanvasPhysics();
}

function runFastCanvasPhysics() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    confettiCanvas.width = window.innerWidth * dpr;
    confettiCanvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const colors = ["#00f2fe", "#f72585", "#fbbf24", "#38bdf8", "#ec4899", "#ffffff"];
    const particles = [];
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Spawn 130 explosive, fast-moving particles
    for (let i = 0; i < 130; i++) {
        const type = i % 3;
        let originX, vx, vy;

        if (type === 0) {
            // Left cannon
            originX = 20;
            vx = Math.random() * 14 + 7;
            vy = -(Math.random() * 18 + 14);
        } else if (type === 1) {
            // Right cannon
            originX = width - 20;
            vx = -(Math.random() * 14 + 7);
            vy = -(Math.random() * 18 + 14);
        } else {
            // Center burst
            originX = width * 0.5 + (Math.random() * 60 - 30);
            vx = (Math.random() - 0.5) * 22;
            vy = -(Math.random() * 20 + 13);
        }

        particles.push({
            x: originX,
            y: height * 0.72,
            vx: vx,
            vy: vy,
            size: Math.random() * 7 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 24,
            gravity: 1.35, // Fast, natural, energetic gravity
            drag: 0.955,    // Fast aerodynamic descent
            opacity: 1,
            isCircle: Math.random() > 0.65
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        let alive = false;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.vx *= p.drag;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.vRot;

            // Fade quickly and cleanly once descending
            if (p.vy > 2) {
                p.opacity -= 0.019;
            }

            if (p.opacity > 0 && p.y < height + 40) {
                alive = true;
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;

                if (p.isCircle) {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 1.4);
                }
                ctx.restore();
            }
        }

        if (alive) {
            fallbackAnimId = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, width, height);
        }
    }

    animate();
}

function clearConfetti() {
    if (confettiTimeouts.length > 0) {
        confettiTimeouts.forEach(t => clearTimeout(t));
        confettiTimeouts = [];
    }
    if (fallbackAnimId) {
        cancelAnimationFrame(fallbackAnimId);
        fallbackAnimId = null;
    }
    if (confettiCanvas) {
        const ctx = confettiCanvas.getContext("2d");
        ctx?.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
    if (typeof confetti === "function" && confetti.reset) {
        confetti.reset();
    }
}

// ===================================================
// EVENT LISTENERS
// ===================================================
resetBtn.addEventListener("click", resetBoard);
newGameBtn.addEventListener("click", resetBoard);

if (inspectBtn) {
    inspectBtn.addEventListener("click", () => {
        triggerHaptic(20);
        msgContainer.classList.add("hide");
        if (viewResultBtn && gameOver) {
            viewResultBtn.classList.remove("hide");
        }
    });
}

if (viewResultBtn) {
    viewResultBtn.addEventListener("click", () => {
        triggerHaptic(20);
        viewResultBtn.classList.add("hide");
        msgContainer.classList.remove("hide");
    });
}

modePvPBtn.addEventListener("click", () => setMode("pvp"));
modeAiBtn.addEventListener("click", () => setMode("ai"));

soundBtn.addEventListener("click", toggleSound);

// Initial Load
updateTurnIndicator();
