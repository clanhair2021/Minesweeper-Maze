let currentLevel = 1;
let totalScore = 0;
let isTimerStopped = false;

let timeLimit = 0;       
let timeLeft = 0;        
let timerId = null;

let clickMode = 'dig', width, height, mineCount, grid, revealed, flagged, gameOver, isFirstClick, startTime;

let safetyRoute = []; 
let currentPlayerIndex = 0;
let walkIntervalId = null;
let isWalking = false; 
let hasReachedGoal = false; 
let isPerfectCleared = false; 

function setClickMode(mode) {
    clickMode = mode;
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(mode === 'dig' ? 'tool-dig' : 'tool-flag').classList.add('active');
}

function calculateStageDifficulty() {
    width = Math.min(24, 7 + Math.floor(currentLevel / 2));
    height = Math.min(24, 7 + Math.floor(currentLevel / 2));
    let mineRatio = Math.min(0.30, 0.12 + (currentLevel * 0.01));
    mineCount = Math.floor(width * height * mineRatio);
    
    timeLimit = Math.max(20, width * 4 + mineCount * 2); 
    timeLeft = timeLimit;

    if (width <= 9) return "35px";
    if (width <= 16) return "26px";
    return "22px";
}

function initGameForCurrentLevel() {
    gameOver = false; 
    isFirstClick = true;
    isTimerStopped = false;
    isWalking = false;
    hasReachedGoal = false;
    isPerfectCleared = false;
    safetyRoute = [];
    currentPlayerIndex = 0;
    if (walkIntervalId) clearInterval(walkIntervalId);
    
    const cellWidth = calculateStageDifficulty();
    
    document.getElementById('level-display').innerText = `Level ${currentLevel}`;
    document.getElementById('score-display').innerText = `Score: ${totalScore}`;
    document.getElementById('mine-counter').innerText = mineCount;
    document.getElementById('timer').innerText = timeLeft.toFixed(1);
    document.getElementById('time-bar').style.width = "100%";
    document.getElementById('result-text').innerText = "";
    document.getElementById('result-text').className = "";
    document.getElementById('next-stage-btn').style.display = "none";
    
    const maxLevel = localStorage.getItem('mines_maze_max_level') || 1;
    document.getElementById('best-score').innerText = `🏆 最高到達階層: Level ${maxLevel}`;

    grid = []; revealed = []; flagged = [];
    for (let x = 0; x < width; x++) {
        grid.push(new Array(height).fill(0));
        revealed.push(new Array(height).fill(false));
        flagged.push(new Array(height).fill(false));
    }
    
    createBoardUI(cellWidth);
}

function resetToLevel1() {
    clearInterval(timerId);
    if (walkIntervalId) clearInterval(walkIntervalId);
    currentLevel = 1;
    totalScore = 0;
    setClickMode('dig');
    initGameForCurrentLevel();
}

function generateRandomMap(firstX, firstY) {
    let sx = firstX, sy = firstY;
    grid[sx][sy] = "S";
    safetyRoute = [{x: sx, y: sy}]; 

    let gx = Math.floor(Math.random() * width), gy = Math.floor(Math.random() * height);
    while (Math.abs(sx - gx) + Math.abs(sy - gy) < Math.floor(width / 2)) {
        gx = Math.floor(Math.random() * width);
        gy = Math.floor(Math.random() * height);
    }

    let cx = sx, cy = sy;
    while(cx !== gx || cy !== gy) {
        if(cx < gx) cx++; else if(cx > gx) cx--;
        else if(cy < gy) cy++; else if(cy > gy) cy--;
        
        safetyRoute.push({x: cx, y: cy}); 
        
        if (cx === gx && cy === gy) {
            grid[cx][cy] = "G";
        } else if (grid[cx][cy] !== "S") {
            grid[cx][cy] = "P";
        }
    }

    let placed = 0;
    while (placed < mineCount) {
        let rx = Math.floor(Math.random() * width), ry = Math.floor(Math.random() * height);
        if (grid[rx][ry] === 0) { 
            grid[rx][ry] = 9; 
            placed++; 
        }
    }

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (grid[x][y] === 9) continue;

            let count = 0;
            for(let i=-1; i<=1; i++) {
                for(let j=-1; j<=1; j++) {
                    let nx = x + i, ny = y + j;
                    if(nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        if (grid[nx][ny] === 9) count++;
                    }
                }
            }

            let originalType = grid[x][y];
            if (originalType === 0) {
                grid[x][y] = { type: 'num', count: count };
            } else {
                grid[x][y] = { type: originalType, count: count };
            }
        }
    }

    document.getElementById(`cell-${sx}-${sy}`).classList.add('player-on');
}

function createBoardUI(cellWidth) {
    const board = document.getElementById('game-board');
    board.innerHTML = "";
    board.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    board.style.width = `calc(${width} * ${cellWidth})`;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${x}-${y}`;
            cell.style.fontSize = width > 16 ? "0.75rem" : "0.9rem";
            cell.onclick = () => handleCellClick(x, y);
            cell.oncontextmenu = (e) => { e.preventDefault(); toggleFlag(x,y); };
            board.appendChild(cell);
        }
    }
}

function toggleFlag(x, y) {
    if (gameOver || revealed[x][y] || isWalking) return;
    flagged[x][y] = !flagged[x][y];
    document.getElementById(`cell-${x}-${y}`).innerText = flagged[x][y] ? "🚩" : "";
    
    const currentFlags = flagged.flat().filter(v => v).length;
    document.getElementById('mine-counter').innerText = Math.max(0, mineCount - currentFlags);
}

function handleCellClick(x, y) {
    if (gameOver || isWalking) return;

    // 既に開いているマスをクリックした時の処理
    if (revealed[x][y]) { 
        const data = grid[x][y];
        
        // 【こだわり仕様】既に開いている「ゴール」をタップしたら移動確認ポップアップを出す
        if (data.type === 'G') {
            showConfirmDialog();
            return;
        }

        if (data.count > 0) {
            let flagCount = 0;
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) {
                let nx=x+i, ny=y+j;
                if(nx>=0 && nx<width && ny>=0 && ny<height && flagged[nx][ny]) flagCount++;
            }
            if (flagCount === data.count) {
                for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) revealCell(x+i, y+j);
            }
        }
        return;
    }
    if (clickMode === 'flag') { toggleFlag(x, y); return; }
    if (flagged[x][y]) return;

    if (isFirstClick) {
        isFirstClick = false;
        generateRandomMap(x, y);
        startTime = Date.now();
        startCountdown();
    }
    revealCell(x, y);
}

function startCountdown() {
    timerId = setInterval(() => {
        if (isTimerStopped || gameOver || isWalking) return;
        
        const elapsed = (Date.now() - startTime) / 1000;
        timeLeft = Math.max(0, timeLimit - elapsed);
        
        document.getElementById('timer').innerText = timeLeft.toFixed(1);
        
        const percentage = (timeLeft / timeLimit) * 100;
        document.getElementById('time-bar').style.width = `${percentage}%`;
    }, 100);
}

function revealCell(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height || revealed[x][y] || flagged[x][y]) return;
    revealed[x][y] = true;
    const cell = document.getElementById(`cell-${x}-${y}`);
    cell.classList.add('open');
    const data = grid[x][y];

    if (data !== 9) {
        totalScore += 5; 
        document.getElementById('score-display').innerText = `Score: ${totalScore}`;
    }

    if (data === 9) { 
        cell.innerText = "💥"; 
        cell.className += " mine"; 
        gameOver = true; 
        clearInterval(timerId); 
        document.getElementById('result-text').innerText = `💀 地雷爆発！ Level ${currentLevel} で終了。\n最終スコア: ${totalScore}`;
        document.getElementById('result-text').className = "game-over";
        revealAllMines();
        return; 
    }
    
    if (data.type === 'G') { 
        cell.innerText = "G"; 
        cell.className += " goal"; 
        hasReachedGoal = true;
        
        // ここでは自動でポップアップを出さず、メッセージと進むボタンを表示するだけに留めます
        document.getElementById('result-text').innerText = `🚩 ゴール発見！(このマスをタップか、ボタンで進めます)\n全消しを狙う場合は探索を続けてください！`;
        document.getElementById('result-text').className = "game-clear";
        document.getElementById('next-stage-btn').style.display = "block";
    } else {
        if (data.count > 0) { 
            cell.innerText = data.count; 
            cell.className += ` c-${data.count}`; 
        } else { 
            cell.innerText = ""; 
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) revealCell(x+i, y+j); 
        }
    }

    checkPerfectClear();
}

function showConfirmDialog() {
    if (isWalking) return;
    if (isPerfectCleared) {
        goToNextStage();
        return;
    }
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirmDialog() {
    document.getElementById('confirm-modal').style.display = 'none';
}

function confirmMoveStage() {
    closeConfirmDialog();
    startCharacterWalk(false); 
}

function startCharacterWalk(isPerfect) {
    isWalking = true;
    isTimerStopped = true; 
    clearInterval(timerId);

    document.getElementById('next-stage-btn').style.display = "none";

    currentPlayerIndex = 0;

    walkIntervalId = setInterval(() => {
        const prevPos = safetyRoute[currentPlayerIndex];
        const prevCell = document.getElementById(`cell-${prevPos.x}-${prevPos.y}`);
        prevCell.classList.remove('player-on');

        currentPlayerIndex++;

        if (currentPlayerIndex < safetyRoute.length) {
            const currPos = safetyRoute[currentPlayerIndex];
            const currCell = document.getElementById(`cell-${currPos.x}-${currPos.y}`);
            currCell.classList.add('player-on');

            revealWalkingCell(currPos.x, currPos.y);
        } else {
            clearInterval(walkIntervalId);
            const finalPos = safetyRoute[safetyRoute.length - 1];
            const finalCell = document.getElementById(`cell-${finalPos.x}-${finalPos.y}`);
            finalCell.classList.remove('player-on');
            finalCell.classList.add('player-goal');
            finalCell.classList.add('goal-success');

            triggerLevelClear(isPerfect);
        }
    }, 200); 
}

function revealWalkingCell(x, y) {
    if (revealed[x][y]) return;
    revealed[x][y] = true;
    const cell = document.getElementById(`cell-${x}-${y}`);
    cell.classList.add('open');
    const data = grid[x][y];

    totalScore += 5; 
    document.getElementById('score-display').innerText = `Score: ${totalScore}`;

    if (data.type === 'G') {
        cell.innerText = "G";
        cell.className += " goal";
    } else if (data.count > 0) {
        cell.innerText = data.count;
        cell.className += ` c-${data.count}`;
    } else {
        cell.innerText = "";
    }
}

function triggerLevelClear(isPerfect) {
    if (isPerfect) {
        const timeBonus = Math.floor(timeLeft * 20); 
        totalScore += 300 + timeBonus; 
        document.getElementById('score-display').innerText = `Score: ${totalScore}`;
        
        document.getElementById('result-text').innerText = `✨ 盤面全開！パーフェクト！\n探索ボーナス(+300) + 残タイム2倍ボーナス(+${timeBonus})`;
        document.getElementById('result-text').className = "game-clear";
        
        setTimeout(() => {
            goToNextStage();
        }, 1200);
    } else {
        const timeBonus = Math.floor(timeLeft * 10); 
        totalScore += 100 + timeBonus; 
        document.getElementById('score-display').innerText = `Score: ${totalScore}`;

        setTimeout(() => {
            goToNextStage();
        }, 1000);
    }
}

function checkPerfectClear() {
    if (gameOver || isWalking || isPerfectCleared) return; 

    let openedSafeCells = 0;
    let totalSafeCells = 0;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (grid[x][y] !== 9) {
                totalSafeCells++;
                if (revealed[x][y]) openedSafeCells++;
            }
        }
    }

    if (openedSafeCells === totalSafeCells) {
        isPerfectCleared = true;
        startCharacterWalk(true); 
    }
}

function goToNextStage() {
    currentLevel++;
    const maxLevel = localStorage.getItem('mines_maze_max_level') || 1;
    if (currentLevel > parseInt(maxLevel)) {
        localStorage.setItem('mines_maze_max_level', currentLevel);
    }
    
    initGameForCurrentLevel();
}

function revealAllMines() {
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (grid[x][y] === 9 && !revealed[x][y]) {
                const cell = document.getElementById(`cell-${x}-${y}`);
                cell.classList.add('open');
                cell.innerText = flagged[x][y] ? "🚩" : "💣";
                cell.className += " mine";
            }
        }
    }
}

// ゲーム起動
resetToLevel1();

