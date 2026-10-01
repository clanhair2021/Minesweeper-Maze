// 全般のゲーム状態
const gameState = {
  currentMode: null,
  theme: 'monochrome',
  coins: 0
};

// 画面切り替え
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// モード開始（各モード専用クラス/関数を呼び出し）
function startMode(mode) {
  gameState.currentMode = mode;
  document.getElementById('mode-label').innerText = mode.toUpperCase();
  showScreen('game-screen');
  
  // モード別初期化呼び出し
  if (mode === 'classic' && window.ClassicMode) {
    ClassicMode.init();
  } else if (mode === 'survival' && window.SurvivalMode) {
    SurvivalMode.init();
  } else if (mode === 'dungeon' && window.DungeonMode) {
    DungeonMode.init();
  }
}

// メインメニューに戻る
function backToMenu() {
  showScreen('menu-screen');
}

// テーマ変更機能
function changeTheme(themeName) {
  gameState.theme = themeName;
  document.documentElement.setAttribute('data-theme', themeName);
}

// モーダル表示切替
function toggleModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.toggle('active');
}

// ログ表示
function addLog(message) {
  const logBox = document.getElementById('log-box');
  logBox.innerText = `> ${message}`;
}
