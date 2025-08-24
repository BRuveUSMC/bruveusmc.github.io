let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameMode = 'friend';
let gameOver = false;
let tips = [
  "Try to place your mark in the center for more control over the game.",
  "Always be aware of your opponent's possible moves.",
  "If you have two in a row, try to place your mark in the third spot to win.",
  "Block your opponent if they have two in a row."
];
let currentTipIndex = 0;

window.onload = function() {
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('menu').style.display = 'flex';
  }, 1000);

  showNextTip();
};

function showNextTip() {
  if (tips.length > 0) {
    document.getElementById('loading-tips').textContent = tips[currentTipIndex];
    currentTipIndex = (currentTipIndex + 1) % tips.length;
  }
}

function showGame(mode) {
  gameMode = mode;
  startGame(mode);
  document.getElementById('menu').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
}

function startGame(mode) {
  gameMode = mode;
  board = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  gameOver = false;
  renderBoard();
}

function renderBoard() {
  const boardDiv = document.getElementById('game-board');
  boardDiv.innerHTML = '';
  board.forEach((cell, index) => {
    const cellDiv = document.createElement('div');
    cellDiv.classList.add('cell');
    cellDiv.textContent = cell;
    cellDiv.addEventListener('click', () => makeMove(index));
    boardDiv.appendChild(cellDiv);
  });
}

function makeMove(index) {
  if (board[index] !== '' || gameOver) return;

  board[index] = currentPlayer;
  renderBoard();

  if (checkWinner()) {
    showResultModal(`${currentPlayer} wins!`);
    gameOver = true;
    return;
  }
  if (board.every(cell => cell !== '')) {
    showResultModal("It's a draw!");
    gameOver = true;
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

  if (gameMode === 'ai' && currentPlayer === 'O') {
    setTimeout(aiMove, 500);
  }
}

function aiMove() {
  if (gameOver) return;

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  let move = findBestMove('O', 'X', winningCombinations);
  if (move !== null) {
    makeMove(move);
    return;
  }

  move = findBestMove('X', 'O', winningCombinations);
  if (move !== null) {
    makeMove(move);
    return;
  }

  if (board[4] === '') {
    makeMove(4);
    return;
  }

  const corners = [0, 2, 6, 8];
  const availableCorners = corners.filter(index => board[index] === '');
  if (availableCorners.length > 0) {
    makeMove(availableCorners[Math.floor(Math.random() * availableCorners.length)]);
    return;
  }

  const emptyCells = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
  if (emptyCells.length > 0) {
    makeMove(emptyCells[Math.floor(Math.random() * emptyCells.length)]);
  }
}

function findBestMove(player, opponent, winningCombinations) {
  for (let combo of winningCombinations) {
    const [a, b, c] = combo;
    if (board[a] === player && board[b] === player && board[c] === '') return c;
    if (board[a] === player && board[b] === '' && board[c] === player) return b;
    if (board[a] === '' && board[b] === player && board[c] === player) return a;
  }
  return null;
}

function checkWinner() {
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  return winningCombinations.some(combination => {
    return combination.every(index => board[index] === currentPlayer);
  });
}

function backToMenu() {
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
}

function showResultModal(message) {
  document.getElementById('gameResultBody').textContent = message;
  $('#gameResultModal').modal('show');
}

function showCredits() {
  $('#creditsModal').modal('show');
}
