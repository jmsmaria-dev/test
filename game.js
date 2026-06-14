const themes = [
  { id: "standard", name: "Standard", icon: "S", image: "" },
  { id: "wizard", name: "Wizard", icon: "W", image: "assets/themes/wizard.png" },
  { id: "unicorn", name: "Unicorn", icon: "U", image: "assets/themes/unicorn.png" },
  { id: "dino", name: "Dino", icon: "D", image: "assets/themes/dino.png" },
  { id: "space", name: "Space", icon: "X", image: "assets/themes/space.png" }
];

const borderColors = [
  "#ef4444",
  "#f59e0b",
  "#facc15",
  "#65a30d",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#ec4899",
  "#a855f7"
];

const playerColors = ["#2563eb", "#ef476f", "#16a34a", "#f59e0b"];
const gridSize = 9;
const difficultyTimes = {
  easy: 60,
  medium: 40,
  hard: 20
};

const state = {
  theme: "standard",
  players: 2,
  rounds: 10,
  difficulty: "medium",
  currentRound: 1,
  currentPlayer: 0,
  scores: [],
  playerNames: ["Player 1", "Player 2", "Player 3", "Player 4"],
  selected: [],
  board: [],
  target: 30,
  timer: difficultyTimes.medium,
  interval: null,
  acceptingInput: false
};

const app = document.querySelector(".app");
const setupView = document.querySelector("#setupView");
const gameView = document.querySelector("#gameView");
const themeOptions = document.querySelector("#themeOptions");
const playerOptions = document.querySelector("#playerOptions");
const roundOptions = document.querySelector("#roundOptions");
const difficultyOptions = document.querySelector("#difficultyOptions");
const playerNameInputs = document.querySelector("#playerNameInputs");
const previewGrid = document.querySelector("#previewGrid");
const gameBoard = document.querySelector("#gameBoard");
const targetNumber = document.querySelector("#targetNumber");
const currentRound = document.querySelector("#currentRound");
const totalRounds = document.querySelector("#totalRounds");
const timer = document.querySelector("#timer");
const equation = document.querySelector("#equation");
const statusLine = document.querySelector("#statusLine");
const scoreboard = document.querySelector("#scoreboard");
const resultDialog = document.querySelector("#resultDialog");
const resultTitle = document.querySelector("#resultTitle");
const resultSummary = document.querySelector("#resultSummary");

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateBoard() {
  const tiles = [];
  borderColors.forEach((color, setIndex) => {
    for (let value = 1; value <= 9; value += 1) {
      const id = `${setIndex}-${value}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      tiles.push({ id, value, color, setIndex });
    }
  });
  return shuffle(tiles);
}

function indexToPoint(index) {
  return {
    row: Math.floor(index / gridSize),
    col: index % gridSize
  };
}

function pointToIndex(row, col) {
  return row * gridSize + col;
}

function isInsideBoard(row, col) {
  return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
}

function isOrderedLine(indices) {
  if (indices.length !== 3) return false;
  const [first, second, third] = indices.map(indexToPoint);
  const rowStep = second.row - first.row;
  const colStep = second.col - first.col;
  const validStep = Math.abs(rowStep) <= 1 && Math.abs(colStep) <= 1 && (rowStep !== 0 || colStep !== 0);

  return validStep
    && third.row - second.row === rowStep
    && third.col - second.col === colStep;
}

function getOrderedLineTriples() {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];
  const triples = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      directions.forEach(([rowStep, colStep]) => {
        const secondRow = row + rowStep;
        const secondCol = col + colStep;
        const thirdRow = row + rowStep * 2;
        const thirdCol = col + colStep * 2;

        if (isInsideBoard(secondRow, secondCol) && isInsideBoard(thirdRow, thirdCol)) {
          triples.push([
            pointToIndex(row, col),
            pointToIndex(secondRow, secondCol),
            pointToIndex(thirdRow, thirdCol)
          ]);
        }
      });
    }
  }

  return triples;
}

function lineMakesTarget(indices, target, board) {
  const [aIndex, bIndex, cIndex] = indices;
  const product = board[aIndex].value * board[bIndex].value;
  return product + board[cIndex].value === target || product - board[cIndex].value === target;
}

function hasSolution(target, board) {
  return getOrderedLineTriples().some((indices) => lineMakesTarget(indices, target, board));
}

function generateTarget(board) {
  const possible = [];
  for (let target = 1; target <= 50; target += 1) {
    if (hasSolution(target, board)) {
      possible.push(target);
    }
  }
  return possible[Math.floor(Math.random() * possible.length)] || 30;
}

function activePlayerName(index) {
  return state.playerNames[index] || `Player ${index + 1}`;
}

function renderTiles(container, board, compact = false) {
  container.innerHTML = "";
  board.forEach((tile, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = compact ? "tile mini-tile" : "tile";
    button.textContent = tile.value;
    button.dataset.index = index;
    button.style.setProperty("--tile-border", tile.color);
    button.style.setProperty("--player-color", playerColors[state.currentPlayer]);
    if (!compact) {
      button.addEventListener("click", () => selectTile(index));
    }
    container.append(button);
  });
}

function renderThemes() {
  themeOptions.innerHTML = "";
  themes.forEach((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `theme-choice${theme.id === state.theme ? " active" : ""}`;
    button.dataset.theme = theme.id;
    if (theme.image) {
      button.style.setProperty("--choice-image", `url("${theme.image}")`);
    }
    button.innerHTML = `<span class="theme-swatch" aria-hidden="true"></span><span>${theme.name}</span>`;
    button.addEventListener("click", () => {
      state.theme = theme.id;
      app.dataset.theme = theme.id;
      renderThemes();
    });
    themeOptions.append(button);
  });
}

function renderScoreboard() {
  scoreboard.innerHTML = "";
  state.scores.forEach((score, index) => {
    const row = document.createElement("div");
    const dot = document.createElement("span");
    const name = document.createElement("span");
    const scoreValue = document.createElement("strong");

    row.className = `player-row${index === state.currentPlayer ? " active" : ""}`;
    dot.className = "player-dot";
    dot.style.background = playerColors[index];
    name.textContent = activePlayerName(index);
    scoreValue.textContent = score;

    row.append(dot, name, scoreValue);
    scoreboard.append(row);
  });
}

function renderPlayerNameInputs() {
  playerNameInputs.querySelectorAll("label").forEach((label, index) => {
    label.classList.toggle("inactive", index >= state.players);
  });
}

function collectPlayerNames() {
  playerNameInputs.querySelectorAll("input").forEach((input, index) => {
    const fallback = `Player ${index + 1}`;
    state.playerNames[index] = input.value.trim() || fallback;
    input.value = state.playerNames[index];
  });
}

function updateHud() {
  targetNumber.textContent = state.target;
  currentRound.textContent = state.currentRound;
  totalRounds.textContent = state.rounds;
  timer.textContent = state.timer;
  renderScoreboard();
  updateEquation();
}

function updateEquation() {
  if (state.selected.length === 0) {
    equation.textContent = "Select 3 tiles";
    return;
  }

  const values = state.selected.map((index) => state.board[index].value);
  equation.textContent = values.length < 3
    ? values.join(" x ")
    : `${values[0]} x ${values[1]} +/- ${values[2]}`;
}

function selectTile(index) {
  if (!state.acceptingInput || state.selected.includes(index)) return;
  state.selected.push(index);
  const tile = gameBoard.querySelector(`[data-index="${index}"]`);
  tile.style.setProperty("--player-color", playerColors[state.currentPlayer]);
  tile.classList.add("selected");
  updateEquation();

  if (state.selected.length === 3) {
    checkSelection();
  } else {
    statusLine.textContent = `${activePlayerName(state.currentPlayer)}, choose number ${state.selected.length + 1}.`;
  }
}

function checkSelection() {
  state.acceptingInput = false;
  const [aIndex, bIndex, cIndex] = state.selected;
  const a = state.board[aIndex].value;
  const b = state.board[bIndex].value;
  const c = state.board[cIndex].value;
  const plus = a * b + c;
  const minus = a * b - c;
  const lineIsValid = isOrderedLine(state.selected);
  const correct = lineIsValid && (plus === state.target || minus === state.target);
  const selectedTiles = state.selected.map((index) => gameBoard.querySelector(`[data-index="${index}"]`));

  if (correct) {
    const operation = plus === state.target ? "+" : "-";
    selectedTiles.forEach((tile) => tile.classList.add("correct"));
    state.scores[state.currentPlayer] += 1;
    statusLine.textContent = `${activePlayerName(state.currentPlayer)} scores: ${a} x ${b} ${operation} ${c} = ${state.target}`;
    window.setTimeout(nextRound, 1000);
  } else {
    selectedTiles.forEach((tile) => tile.classList.add("incorrect"));
    statusLine.textContent = lineIsValid
      ? `${a} x ${b} + ${c} = ${plus}, and ${a} x ${b} - ${c} = ${minus}. Try again.`
      : "Those 3 tiles must be clicked in order in one straight horizontal, vertical, or diagonal line.";
    window.setTimeout(() => {
      clearSelection();
      state.currentPlayer = (state.currentPlayer + 1) % state.players;
      state.acceptingInput = true;
      statusLine.textContent = `${activePlayerName(state.currentPlayer)}, choose your first number.`;
      renderScoreboard();
    }, 850);
  }
}

function clearSelection() {
  state.selected = [];
  gameBoard.querySelectorAll(".selected, .correct, .incorrect").forEach((tile) => {
    tile.classList.remove("selected", "correct", "incorrect");
  });
  updateEquation();
}

function startTimer() {
  window.clearInterval(state.interval);
  state.timer = difficultyTimes[state.difficulty];
  timer.textContent = state.timer;
  state.interval = window.setInterval(() => {
    state.timer -= 1;
    timer.textContent = state.timer;
    if (state.timer <= 0) {
      statusLine.textContent = "Time is up. New target coming in.";
      nextRound();
    }
  }, 1000);
}

function setupRound(newBoard = false) {
  if (newBoard || state.board.length === 0) {
    state.board = generateBoard();
    renderTiles(gameBoard, state.board);
  } else if (gameBoard.children.length !== state.board.length) {
    renderTiles(gameBoard, state.board);
  }
  state.target = generateTarget(state.board);
  state.selected = [];
  state.currentPlayer = (state.currentRound - 1) % state.players;
  state.acceptingInput = true;
  clearSelection();
  updateHud();
  statusLine.textContent = `${activePlayerName(state.currentPlayer)}, choose your first number.`;
  startTimer();
}

function nextRound() {
  window.clearInterval(state.interval);
  state.acceptingInput = false;
  if (state.currentRound >= state.rounds) {
    endGame();
    return;
  }
  state.currentRound += 1;
  setupRound(false);
}

function startGame() {
  collectPlayerNames();
  state.scores = Array.from({ length: state.players }, () => 0);
  state.currentRound = 1;
  state.board = generateBoard();
  setupView.classList.add("hidden");
  gameView.classList.remove("hidden");
  window.requestAnimationFrame(() => {
    renderTiles(gameBoard, state.board);
    setupRound(false);
  });
}

function endGame() {
  const highScore = Math.max(...state.scores);
  const winners = state.scores
    .map((score, index) => ({ score, index }))
    .filter((player) => player.score === highScore)
    .map((player) => activePlayerName(player.index));
  resultTitle.textContent = winners.length > 1 ? "Tie Game" : `${winners[0]} Wins`;
  resultSummary.textContent = state.scores
    .map((score, index) => `${activePlayerName(index)}: ${score}`)
    .join(" | ");
  resultDialog.showModal();
}

function returnToSetup() {
  window.clearInterval(state.interval);
  if (resultDialog.open) {
    resultDialog.close();
  }
  gameView.classList.add("hidden");
  setupView.classList.remove("hidden");
  state.acceptingInput = false;
  renderPreview();
}

function renderPreview() {
  renderTiles(previewGrid, generateBoard(), true);
}

function bindSegmented(container, key, attr) {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state[key] = Number(button.dataset[attr]);
    container.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    if (key === "players") {
      renderPlayerNameInputs();
    }
  });
}

function bindChoice(container, key, attr) {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state[key] = button.dataset[attr];
    container.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
}

document.querySelector("#startGame").addEventListener("click", startGame);
document.querySelector("#newBoard").addEventListener("click", () => setupRound(true));
document.querySelector("#quitGame").addEventListener("click", returnToSetup);
document.querySelector("#previewBoard").addEventListener("click", renderPreview);
document.querySelector("#closeResult").addEventListener("click", returnToSetup);
document.querySelector("#rematch").addEventListener("click", () => {
  resultDialog.close();
  startGame();
});

bindSegmented(playerOptions, "players", "players");
bindSegmented(roundOptions, "rounds", "rounds");
bindChoice(difficultyOptions, "difficulty", "difficulty");
renderThemes();
renderPlayerNameInputs();
renderPreview();
