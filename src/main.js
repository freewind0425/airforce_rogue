import { AssetLoader } from './systems/AssetLoader.js';
import { Game } from './systems/Game.js';

const $ = (id) => document.getElementById(id);

const loader = new AssetLoader('./data/asset_manifest.json');
const game = new Game({
  canvas: $('gameCanvas'),
  hud: {
    hpFrame: $('hpFrameImg'),
    hpFill: $('hpFillImg'),
    hpFillClip: $('hpFillClip'),
    wavePanel: $('wavePanelImg'),
    waveText: $('waveText'),
    expFill: $('expFill'),
    pauseMenu: $('pauseMenu'),
    speedBtn: $('speedBtn'),
    levelUpBtn: $('levelUpBtn'),
    levelUpModal: $('levelUpModal'),
    levelUpCards: $('levelUpCards'),
    resultScreen: $('resultScreen'),
    resultTitle: $('resultTitle'),
    resultStage: $('resultStage'),
    resultWave: $('resultWave'),
    resultKills: $('resultKills'),
    resultTime: $('resultTime')
  }
});

let selectedShip = 'falcon';

function showLobbyShip() {
  const path = loader.manifest.assets.player[selectedShip][0];
  $('lobbyShip').src = path;
  $('lobbyShipName').textContent = selectedShip.toUpperCase();
}

function goToLobby() {
  game.stop();
  $('game').classList.remove('active');
  $('lobby').classList.add('active');
}

async function boot() {
  await loader.load();
  game.setAssets(loader);
  showLobbyShip();

  $('selectFalcon').onclick = () => { selectedShip = 'falcon'; showLobbyShip(); };
  $('selectVulcan').onclick = () => { selectedShip = 'vulcan'; showLobbyShip(); };

  $('startGame').onclick = () => {
    $('lobby').classList.remove('active');
    $('game').classList.add('active');
    game.start({ shipId: selectedShip });
  };

  $('pauseBtn').onclick = () => game.pause();
  $('resumeBtn').onclick = () => game.resume();
  $('settleBtn').onclick = () => {
    // 정산: 결과 화면을 먼저 보여주고, 확인 시 로비로 이동
    game.running = false;
    game.showResult({ gameOver: false });
  };
  $('resultConfirmBtn').onclick = () => goToLobby();
}

boot().catch((err) => {
  console.error('[Project K] Boot failed:', err);
  alert('에셋 로딩 실패. 콘솔을 확인하세요.');
});
