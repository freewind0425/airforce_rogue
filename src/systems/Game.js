import { SHIP_BASE_WEAPON, rollCards } from './WeaponData.js';

export class Game {
  constructor({ canvas, hud }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;
    this.assets = null;

    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.speedIndex = 0;
    this.speedValues = [1, 2, 3, 4, 5];

    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.fx = [];
    this.stage = 1;
    this.wave = 1;
    this.kills = 0;
    this.elapsed = 0;

    this.pendingCards = null; // 레벨업 카드 선택 대기 중이면 카드 배열
    this.pendingLevelUps = 0; // 누적된 레벨업 가능 횟수

    this.pointer = { x: 0, y: 0, active: false };

    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerMove(e));

    this.hud.speedBtn.onclick = () => this.toggleSpeed();
    if (this.hud.levelUpBtn) this.hud.levelUpBtn.onclick = () => this.openLevelUpChoice();
  }

  setAssets(loader) {
    this.assets = loader;
    const ui = loader.manifest.assets.ui;
    this.hud.hpFrame.src = ui.hpFrame;
    this.hud.hpFill.src = ui.hpFill;
    this.hud.wavePanel.src = ui.wavePanel;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start({ shipId = 'falcon' } = {}) {
    this.resize();
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.stage = 1;
    this.wave = 1;
    this.kills = 0;
    this.elapsed = 0;
    this.enemies = [];
    this.projectiles = [];
    this.fx = [];
    this.pendingCards = null;
    this.pendingLevelUps = 0;

    this.player = {
      shipId,
      baseWeapon: SHIP_BASE_WEAPON[shipId] || 'laser',
      level: 1,
      x: this.canvas.width / 2,
      y: this.canvas.height - 120,
      hp: 100,
      maxHp: 100,
      exp: 0,
      expToNext: 30,
      fireCooldown: 0,
      stats: {
        damageMul: 1,
        fireRateMul: 1,
        moveSmoothing: 0.35
      },
      combos: {
        missile: false,
        missileDamageMul: 1,
        missileCooldown: 2.0,
        missileTimer: 0
      }
    };

    this.spawnWave();
    this.updateHud();
    this.hideResult();
    this.hideLevelUpModal();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.hud.pauseMenu.classList.add('hidden');
  }

  pause() {
    if (!this.running || this.pendingCards) return;
    this.paused = true;
    this.hud.pauseMenu.classList.remove('hidden');
  }

  resume() {
    if (!this.running) return;
    this.paused = false;
    this.hud.pauseMenu.classList.add('hidden');
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  toggleSpeed() {
    this.speedIndex = (this.speedIndex + 1) % this.speedValues.length;
    this.hud.speedBtn.textContent = `x${this.speedValues[this.speedIndex]}`;
  }

  onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
    if (this.player) {
      this.player.targetX = this.pointer.x;
      this.player.targetY = Math.min(this.canvas.height - 70, this.pointer.y);
    }
  }

  // ---------- Level-up flow ----------
  openLevelUpChoice() {
    if (!this.running || this.pendingCards || this.pendingLevelUps <= 0) return;
    this.paused = true;
    this.pendingCards = rollCards(this.player, 3);
    this.renderLevelUpModal();
  }

  renderLevelUpModal() {
    if (!this.hud.levelUpModal || !this.hud.levelUpCards) return;
    this.hud.levelUpCards.innerHTML = '';
    this.pendingCards.forEach((card) => {
      const el = document.createElement('button');
      el.className = `upgrade-card card-${card.type}`;
      el.innerHTML = `<div class="card-title">${card.title}</div><div class="card-desc">${card.desc}</div>`;
      el.onclick = () => this.chooseCard(card);
      this.hud.levelUpCards.appendChild(el);
    });
    this.hud.levelUpModal.classList.remove('hidden');
  }

  chooseCard(card) {
    card.apply(this.player);
    this.player.level = Math.min(5, this.player.level + 1);
    this.pendingCards = null;
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);

    if (this.pendingLevelUps > 0) {
      // 누적된 레벨업이 남아있으면 바로 다음 카드 선택을 이어서 노출
      this.pendingCards = rollCards(this.player, 3);
      this.renderLevelUpModal();
      this.updateLevelUpButton();
      return;
    }

    this.hideLevelUpModal();
    this.paused = false;
    this.lastTime = performance.now();
    this.updateLevelUpButton();
    requestAnimationFrame((t) => this.loop(t));
  }

  hideLevelUpModal() {
    if (this.hud.levelUpModal) this.hud.levelUpModal.classList.add('hidden');
  }

  updateLevelUpButton() {
    if (!this.hud.levelUpBtn) return;
    const ready = this.pendingLevelUps > 0;
    this.hud.levelUpBtn.classList.toggle('ready', ready);
    this.hud.levelUpBtn.disabled = !ready;
    this.hud.levelUpBtn.textContent = ready ? `LEVEL UP ${this.pendingLevelUps}` : 'LEVEL UP';
  }

  gainExp(amount) {
    if (!this.player) return;
    this.player.exp += amount;
    // expToNext를 넘을 때마다 누적 레벨업 카운트 +1, 초과분은 다음 게이지로 carry-over
    while (this.player.exp >= this.player.expToNext) {
      this.player.exp -= this.player.expToNext;
      this.pendingLevelUps += 1;
      this.player.expToNext = Math.round(this.player.expToNext * 1.35);
    }
    this.updateLevelUpButton();
  }

  // ---------- Main loop ----------
  loop(time) {
    if (!this.running || this.paused) return;
    const speed = this.speedValues[this.speedIndex];
    const dt = Math.min((time - this.lastTime) / 1000, 0.033) * speed;
    this.lastTime = time;

    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.elapsed += dt;

    // 부드러운 이동 (포인터 목표로 이동)
    if (this.player.targetX !== undefined) {
      const s = this.player.stats.moveSmoothing;
      this.player.x += (this.player.targetX - this.player.x) * s;
      this.player.y += (this.player.targetY - this.player.y) * s;
    }

    this.player.fireCooldown -= dt;
    if (this.player.fireCooldown <= 0) {
      this.firePlayerWeapon();
      const baseInterval = 0.18;
      this.player.fireCooldown = baseInterval / this.player.stats.fireRateMul;
    }

    if (this.player.combos.missile) {
      this.player.combos.missileTimer -= dt;
      if (this.player.combos.missileTimer <= 0) {
        this.fireComboMissile();
        this.player.combos.missileTimer = this.player.combos.missileCooldown;
      }
    }

    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }

    for (const e of this.enemies) {
      e.y += e.speed * dt;
      if (e.type === 'boss') e.x += Math.sin(performance.now() / 600) * 20 * dt;
    }

    this.handleCollisions();
    this.updateFx(dt);

    this.projectiles = this.projectiles.filter((p) => p.life > 0 && p.y > -160 && p.y < this.canvas.height + 160);
    this.enemies = this.enemies.filter((e) => e.hp > 0 && e.y < this.canvas.height + 160);

    if (this.enemies.length === 0) {
      this.nextWave();
    }

    if (this.player.hp <= 0) {
      this.gameOver();
    }

    this.updateHud();
  }

  firePlayerWeapon() {
    const weapon = this.assets.manifest.assets.weapon;
    const level = this.player.level;
    const dmgMul = this.player.stats.damageMul;
    const isVulcan = this.player.baseWeapon === 'vulcan';

    const shots = level >= 4 ? [-24, 0, 24] : level >= 2 ? [-14, 14] : [0];
    for (const offset of shots) {
      const usePlasma = !isVulcan && level >= 3;
      this.projectiles.push({
        type: usePlasma ? 'plasma' : 'laser',
        imgPath: usePlasma ? weapon.plasma : weapon.laserBlue,
        x: this.player.x + offset,
        y: this.player.y - 48,
        vx: offset * 2,
        vy: -680,
        damage: (usePlasma ? 22 : 14) * dmgMul,
        life: 2
      });
    }
  }

  fireComboMissile() {
    const weapon = this.assets.manifest.assets.weapon;
    const target = this.pickMissileTarget();
    const vx = target ? (target.x - this.player.x) * 0.6 : 0;
    const vy = target ? Math.min(-260, (target.y - this.player.y) * 0.6) : -520;

    this.projectiles.push({
      type: 'missile',
      imgPath: weapon.missile,
      x: this.player.x,
      y: this.player.y - 30,
      vx,
      vy,
      homingTarget: target || null,
      damage: 30 * this.player.combos.missileDamageMul,
      life: 3
    });
  }

  pickMissileTarget() {
    // 우선순위: Boss > Elite > Nearest
    const boss = this.enemies.find((e) => e.type === 'boss');
    if (boss) return boss;
    const elite = this.enemies.find((e) => e.type === 'elite');
    if (elite) return elite;
    let nearest = null;
    let bestDist = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bestDist) { bestDist = d; nearest = e; }
    }
    return nearest;
  }

  spawnWave() {
    const isBoss = this.stage % 5 === 0;
    if (isBoss) {
      const bossPath = this.assets.manifest.assets.boss.stage05;
      this.enemies.push({
        type: 'boss',
        imgPath: bossPath,
        x: this.canvas.width / 2,
        y: 150,
        hp: 600 + this.stage * 70,
        maxHp: 600 + this.stage * 70,
        speed: 8,
        radius: 150
      });
      return;
    }

    const enemyAssets = this.assets.manifest.assets.enemy;
    const types = ['scout', 'interceptor', 'bomber', 'elite'];
    const count = 4 + this.wave;
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const hp = type === 'elite' ? 80 : type === 'bomber' ? 55 : type === 'scout' ? 22 : 35;
      this.enemies.push({
        type,
        imgPath: enemyAssets[type],
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: -80 - i * 70,
        hp,
        maxHp: hp,
        speed: type === 'scout' ? 130 : type === 'bomber' ? 55 : type === 'elite' ? 70 : 95,
        radius: type === 'elite' ? 44 : 34
      });
    }
  }

  nextWave() {
    this.wave += 1;
    if (this.wave > 3) {
      this.wave = 1;
      this.stage += 1;
    }
    this.spawnWave();
  }

  handleCollisions() {
    for (const p of this.projectiles) {
      for (const e of this.enemies) {
        const dist = Math.hypot(p.x - e.x, p.y - e.y);
        if (dist < e.radius) {
          e.hp -= p.damage;
          p.life = 0;
          this.spawnFx('hit', p.x, p.y, 0.35);
          if (e.hp <= 0) {
            this.spawnFx('explosion', e.x, e.y, e.type === 'boss' ? 1.4 : 0.65);
            this.kills += 1;
            this.gainExp(e.type === 'boss' ? 50 : e.type === 'elite' ? 12 : e.type === 'bomber' ? 8 : 4);
          }
        }
      }
    }

    for (const e of this.enemies) {
      const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      if (dist < e.radius + 34 && e.type !== 'boss') {
        e.hp = 0;
        this.player.hp -= 15;
        this.spawnFx('explosion', e.x, e.y, 0.55);
      }
    }
  }

  spawnFx(type, x, y, scale) {
    const frames = type === 'hit' ? this.assets.manifest.assets.fx.hit : this.assets.manifest.assets.fx.explosion;
    const duration = type === 'hit' ? 0.28 : 0.45;
    this.fx.push({ frames, frameIndex: 0, x, y, scale, life: duration, maxLife: duration });
  }

  updateFx(dt) {
    for (const f of this.fx) {
      f.life -= dt;
      const framesCount = f.frames.length;
      const progress = 1 - Math.max(0, f.life / f.maxLife);
      f.frameIndex = Math.min(framesCount - 1, Math.floor(progress * framesCount));
    }
    this.fx = this.fx.filter((f) => f.life > 0);
  }

  gameOver() {
    this.running = false;
    this.showResult({ gameOver: true });
  }

  // ---------- HUD ----------
  updateHud() {
    const hpPct = Math.max(0, this.player.hp / this.player.maxHp);
    this.hud.hpFillClip.style.width = `${Math.floor(200 * hpPct)}px`;
    this.hud.waveText.textContent = `STAGE ${this.stage}  WAVE ${this.wave}`;
    if (this.hud.expFill) {
      const expPct = Math.min(1, this.player.exp / this.player.expToNext);
      this.hud.expFill.style.width = `${Math.floor(100 * expPct)}%`;
    }
  }

  hideResult() {
    if (this.hud.resultScreen) this.hud.resultScreen.classList.add('hidden');
  }

  showResult({ gameOver = false } = {}) {
    if (!this.hud.resultScreen) return;
    if (this.hud.resultTitle) this.hud.resultTitle.textContent = gameOver ? 'GAME OVER' : 'RESULT';
    if (this.hud.resultStage) this.hud.resultStage.textContent = `STAGE ${this.stage}`;
    if (this.hud.resultWave) this.hud.resultWave.textContent = `WAVE ${this.wave}`;
    if (this.hud.resultKills) this.hud.resultKills.textContent = `${this.kills} KILLS`;
    if (this.hud.resultTime) {
      const total = Math.floor(this.elapsed);
      const m = String(Math.floor(total / 60)).padStart(2, '0');
      const s = String(total % 60).padStart(2, '0');
      this.hud.resultTime.textContent = `${m}:${s}`;
    }
    this.hud.pauseMenu.classList.add('hidden');
    this.hud.resultScreen.classList.remove('hidden');
  }

  // ---------- Draw ----------
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#071127';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(56,189,248,.07)';
    for (let y = 0; y < h; y += 42) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    this.drawEnemies(ctx);
    this.drawProjectiles(ctx);
    this.drawPlayer(ctx);
    this.drawFx(ctx);
  }

  drawImageCentered(ctx, imgPath, x, y, width, height, fallbackColor = '#38bdf8') {
    const img = imgPath ? this.assets.getByPath(imgPath) : null;
    if (img) {
      ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
    } else {
      ctx.fillStyle = fallbackColor;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(width, height) / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(ctx) {
    const paths = this.assets.manifest.assets.player[this.player.shipId];
    const imgPath = paths[Math.min(4, this.player.level - 1)];
    this.drawImageCentered(ctx, imgPath, this.player.x, this.player.y, 118, 118);

    const engine = this.assets.manifest.assets.fx.engineBlue;
    this.drawImageCentered(ctx, engine, this.player.x, this.player.y + 50, 36, 64);
  }

  drawEnemies(ctx) {
    for (const e of this.enemies) {
      const size = e.type === 'boss' ? 360
        : e.type === 'elite' ? 92
        : e.type === 'bomber' ? 82
        : e.type === 'scout' ? 60
        : 72;
      this.drawImageCentered(ctx, e.imgPath, e.x, e.y, size, size);

      if (e.type === 'boss') {
        ctx.fillStyle = 'rgba(255,0,0,.25)';
        ctx.fillRect(80, 80, this.canvas.width - 160, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(80, 80, (this.canvas.width - 160) * Math.max(0, e.hp / e.maxHp), 8);
      }
    }
  }

  drawProjectiles(ctx) {
    for (const p of this.projectiles) {
      let size = 24;
      let height = size;
      if (p.type === 'plasma') { size = 42; height = 42; }
      if (p.type === 'laser') { size = 24; height = 86; }
      if (p.type === 'missile') { size = 28; height = 48; }
      this.drawImageCentered(ctx, p.imgPath, p.x, p.y, size, height, '#7dd3fc');
    }
  }

  drawFx(ctx) {
    for (const f of this.fx) {
      const alpha = Math.max(0, f.life / f.maxLife);
      const imgPath = f.frames[f.frameIndex];
      ctx.globalAlpha = alpha;
      this.drawImageCentered(ctx, imgPath, f.x, f.y, 140 * f.scale, 140 * f.scale, '#fff');
      ctx.globalAlpha = 1;
    }
  }
}
