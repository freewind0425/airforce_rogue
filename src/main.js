// main.js - GO AIR RAID prototype (Project K Engine)

const Game = {
  state: 'select', // select | playing | gameover | clear
  player: null,
  bullets: [],
  enemyBullets: [],
  enemies: [],
  boss: null,
  particles: [],
  floatTexts: [],
  keys: {},
  pointer: { active: false, x: 0, y: 0 },
  stageIndex: 0,
  stageTimer: 0,
  speedLevel: 1, // 1..5
  score: 0,
  frame: 0,
  waveInterval: 70,

  async start() {
    await Engine.loadData();
    this.canvas = document.getElementById('game');
    Engine.init(this.canvas);
    this.bindInput();
    this.showSelect();
    requestAnimationFrame(this.loop.bind(this));
  },

  bindInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key >= '1' && e.key <= '5') this.setSpeed(parseInt(e.key, 10));
    });
    window.addEventListener('keyup', e => (this.keys[e.key.toLowerCase()] = false));

    const rect = () => this.canvas.getBoundingClientRect();
    const move = (clientX, clientY) => {
      const r = rect();
      this.pointer.x = ((clientX - r.left) / r.width) * Engine.width;
      this.pointer.y = ((clientY - r.top) / r.height) * Engine.height;
    };
    this.canvas.addEventListener('mousedown', e => { this.pointer.active = true; move(e.clientX, e.clientY); });
    window.addEventListener('mousemove', e => { if (this.pointer.active) move(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => (this.pointer.active = false));
    this.canvas.addEventListener('touchstart', e => { this.pointer.active = true; move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    this.canvas.addEventListener('touchmove', e => { move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    this.canvas.addEventListener('touchend', () => (this.pointer.active = false));

    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setSpeed(parseInt(btn.dataset.speed, 10)));
    });
  },

  setSpeed(lv) {
    this.speedLevel = Math.max(1, Math.min(5, lv));
    document.querySelectorAll('.speed-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.speed, 10) === this.speedLevel);
    });
  },

  showSelect() {
    this.state = 'select';
    document.getElementById('select-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.querySelectorAll('.aircraft-card').forEach(card => {
      card.onclick = () => this.selectAircraft(card.dataset.id);
    });
  },

  selectAircraft(id) {
    this.player = new Player(id);
    this.bullets = []; this.enemyBullets = []; this.enemies = []; this.boss = null;
    this.particles = []; this.floatTexts = [];
    this.stageIndex = 0; this.stageTimer = 0; this.score = 0; this.frame = 0;
    this.setSpeed(1);
    document.getElementById('select-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    this.state = 'playing';
  },

  currentStage() {
    return Engine.data.stage.stages[this.stageIndex];
  },

  spawnWave() {
    const stage = this.currentStage();
    const pool = stage.enemyPool;
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const defId = pool[Math.floor(Math.random() * pool.length)];
      const x = 40 + Math.random() * (Engine.width - 80);
      this.enemies.push(new Enemy(defId, x, -30 - i * 40, stage.density));
    }
  },

  spawnBoss() {
    const stage = this.currentStage();
    if (stage.boss) {
      this.boss = new Boss(stage.boss, stage.density);
      this.spawnFloatText(Engine.width / 2, Engine.height / 2, 'WARNING: BOSS', '#ff4d4d');
    }
  },

  spawnFloatText(x, y, text, color) {
    this.floatTexts.push({ x, y, text, color, life: 60 });
  },

  fireWeapon(weaponId, fromPos, isPlayer = true) {
    const wdef = Engine.data.weapon[weaponId];
    const dmg = isPlayer ? wdef.damage * this.player.damageMult : wdef.damage;
    switch (wdef.type) {
      case 'straight':
      case 'combo':
        if (wdef.missileCount) {
          for (let i = 0; i < wdef.missileCount; i++) {
            const ang = -Math.PI / 2 + (i - (wdef.missileCount - 1) / 2) * 0.25;
            this.bullets.push(new Bullet(new Vec(fromPos.x, fromPos.y),
              new Vec(Math.cos(ang) * wdef.projectileSpeed, Math.sin(ang) * wdef.projectileSpeed),
              dmg, wdef.color, 'player', { homing: true, turnRate: wdef.turnRate || 0.1 }));
          }
        } else if (wdef.spread) {
          for (let i = 0; i < wdef.spread; i++) {
            const off = (i - (wdef.spread - 1) / 2) * 0.15;
            this.bullets.push(new Bullet(new Vec(fromPos.x, fromPos.y),
              new Vec(Math.sin(off) * wdef.projectileSpeed, -Math.cos(off) * wdef.projectileSpeed),
              dmg, wdef.color, 'player'));
          }
        } else {
          this.bullets.push(new Bullet(new Vec(fromPos.x, fromPos.y), new Vec(0, -wdef.projectileSpeed), dmg, wdef.color, 'player', { radius: 5 }));
        }
        break;
      case 'laser':
        this.bullets.push(new Bullet(new Vec(fromPos.x, fromPos.y), new Vec(0, -wdef.projectileSpeed), dmg, wdef.color, 'player', { radius: 3 }));
        break;
      case 'homing':
        this.bullets.push(new Bullet(new Vec(fromPos.x, fromPos.y), new Vec(0, -wdef.projectileSpeed), dmg, wdef.color, 'player', { homing: true, turnRate: wdef.turnRate }));
        break;
      case 'chain':
        for (let i = 0; i < (wdef.spread || 1); i++) {
          const off = (i - ((wdef.spread || 1) - 1) / 2) * 0.12;
          this.bullets.push(new Bullet(new Vec(fromPos.x, fromPos.y),
            new Vec(Math.sin(off) * wdef.projectileSpeed, -Math.cos(off) * wdef.projectileSpeed),
            dmg, wdef.color, 'player'));
        }
        break;
      case 'shield':
        break; // 패시브 처리
    }
  },

  update() {
    if (this.state !== 'playing') return;
    this.frame++;
    const sp = this.player;

    // 이동
    let dx = 0, dy = 0;
    if (this.keys['arrowleft'] || this.keys['a']) dx -= 1;
    if (this.keys['arrowright'] || this.keys['d']) dx += 1;
    if (this.keys['arrowup'] || this.keys['w']) dy -= 1;
    if (this.keys['arrowdown'] || this.keys['s']) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      sp.pos.x += (dx / len) * sp.speed;
      sp.pos.y += (dy / len) * sp.speed;
    } else if (this.pointer.active) {
      sp.pos.x += (this.pointer.x - sp.pos.x) * 0.25;
      sp.pos.y += (this.pointer.y - sp.pos.y) * 0.25;
    }
    sp.pos.x = Math.max(sp.radius, Math.min(Engine.width - sp.radius, sp.pos.x));
    sp.pos.y = Math.max(sp.radius, Math.min(Engine.height - sp.radius, sp.pos.y));

    // 발사
    for (const wId of sp.weapons) {
      const wdef = Engine.data.weapon[wId];
      if (wdef.type === 'shield') {
        if (sp.shieldCharges < wdef.blockHits && sp.shieldCooldown <= 0) {
          sp.shieldCharges = wdef.blockHits;
        }
        if (sp.shieldCooldown > 0) sp.shieldCooldown--;
        continue;
      }
      sp.cooldowns[wId] = (sp.cooldowns[wId] || 0) - 1;
      if (sp.cooldowns[wId] <= 0) {
        this.fireWeapon(wId, sp.pos, true);
        sp.cooldowns[wId] = Math.max(2, wdef.fireInterval / sp.fireRate);
      }
    }

    if (sp.invuln > 0) sp.invuln--;

    // 스테이지 진행 (속도 배율 영향)
    const speedMult = Engine.data.stage.speedMultipliers[this.speedLevel - 1];
    this.stageTimer += speedMult;
    if (!this.boss) {
      if (this.stageTimer % this.waveInterval < speedMult) this.spawnWave();
      if (this.stageTimer >= Engine.data.stage.stageLength) {
        this.spawnBoss();
        this.stageTimer = 0;
      }
    }

    // 적 업데이트
    for (const e of this.enemies) {
      const tmp = e.speed; e.speed = tmp * speedMult; e.update(); e.speed = tmp;
      if (e.def.pattern === 'hover_shoot' && e.entered !== false) {
        e.fireTimer--;
        if (e.fireTimer <= 0) {
          e.fireTimer = e.def.fireInterval;
          const dx2 = sp.pos.x - e.pos.x, dy2 = sp.pos.y - e.pos.y;
          const ang = Math.atan2(dy2, dx2);
          this.enemyBullets.push(new Bullet(new Vec(e.pos.x, e.pos.y),
            new Vec(Math.cos(ang) * e.def.bulletSpeed, Math.sin(ang) * e.def.bulletSpeed),
            10, '#f87171', 'enemy', { radius: 5 }));
        }
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);

    // 보스 업데이트
    if (this.boss) {
      for (let i = 0; i < speedMult; i++) this.boss.update();
      const phase = this.boss.currentPhase();
      this.boss.fireTimer -= speedMult;
      if (this.boss.entered && this.boss.fireTimer <= 0) {
        this.boss.fireTimer = phase.fireInterval;
        this.bossFire(phase);
      }
      if (this.boss.dead) {
        this.score += this.boss.def.scoreValue;
        sp.gainXP(300);
        this.boss = null;
        this.stageIndex++;
        if (this.stageIndex >= Engine.data.stage.stages.length) {
          this.endGame('clear');
          return;
        }
      }
    }

    // 총알 업데이트
    for (const b of this.bullets) b.update();
    for (const b of this.enemyBullets) {
      b.pos.x += b.vel.x * speedMult; b.pos.y += b.vel.y * speedMult;
      if (b.pos.y > Engine.height + 20 || b.pos.y < -20) b.dead = true;
    }
    this.bullets = this.bullets.filter(b => !b.dead);
    this.enemyBullets = this.enemyBullets.filter(b => !b.dead);

    this.handleCollisions();

    this.floatTexts.forEach(f => { f.y -= 0.5; f.life--; });
    this.floatTexts = this.floatTexts.filter(f => f.life > 0);

    if (sp.hp <= 0) this.endGame('gameover');

    this.updateHUD();
  },

  bossFire(phase) {
    const b = this.boss;
    const dmg = 14;
    switch (phase.pattern) {
      case 'spread_shot':
        for (let i = -2; i <= 2; i++) {
          const ang = Math.PI / 2 + i * 0.18;
          this.enemyBullets.push(new Bullet(new Vec(b.pos.x, b.pos.y),
            new Vec(Math.cos(ang) * phase.bulletSpeed, Math.sin(ang) * phase.bulletSpeed), dmg, b.def.color, 'enemy', { radius: 6 }));
        }
        break;
      case 'fan_shot':
        for (let i = -4; i <= 4; i++) {
          const ang = Math.PI / 2 + i * 0.14;
          this.enemyBullets.push(new Bullet(new Vec(b.pos.x, b.pos.y),
            new Vec(Math.cos(ang) * phase.bulletSpeed, Math.sin(ang) * phase.bulletSpeed), dmg, b.def.color, 'enemy', { radius: 6 }));
        }
        break;
      case 'barrage':
        for (let i = -6; i <= 6; i++) {
          const ang = Math.PI / 2 + i * 0.1;
          this.enemyBullets.push(new Bullet(new Vec(b.pos.x, b.pos.y),
            new Vec(Math.cos(ang) * phase.bulletSpeed, Math.sin(ang) * phase.bulletSpeed), dmg, b.def.color, 'enemy', { radius: 6 }));
        }
        break;
    }
  },

  handleCollisions() {
    const sp = this.player;

    // 플레이어 총알 vs 적
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(b.pos.x - e.pos.x, b.pos.y - e.pos.y) < b.radius + e.radius) {
          e.hp -= b.damage;
          b.dead = true;
          if (e.hp <= 0 && !e.dead) {
            e.dead = true;
            this.score += e.def.scoreValue;
            sp.gainXP(20);
            sp.addCore(8);
          }
          break;
        }
      }
      if (this.boss && !b.dead && Math.hypot(b.pos.x - this.boss.pos.x, b.pos.y - this.boss.pos.y) < b.radius + this.boss.radius) {
        this.boss.hp -= b.damage;
        b.dead = true;
        sp.addCore(1);
      }
    }
    this.bullets = this.bullets.filter(b => !b.dead);
    this.enemies = this.enemies.filter(e => !e.dead);

    // 적/보스 총알 vs 플레이어
    for (const b of this.enemyBullets) {
      if (Math.hypot(b.pos.x - sp.pos.x, b.pos.y - sp.pos.y) < b.radius + sp.radius) {
        b.dead = true;
        this.damagePlayer(b.damage);
      }
    }
    this.enemyBullets = this.enemyBullets.filter(b => !b.dead);

    // 적 직접 충돌
    for (const e of this.enemies) {
      if (Math.hypot(e.pos.x - sp.pos.x, e.pos.y - sp.pos.y) < e.radius + sp.radius) {
        e.dead = true;
        this.damagePlayer(20);
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  },

  damagePlayer(amount) {
    const sp = this.player;
    if (sp.invuln > 0) return;
    if (sp.shieldCharges > 0) {
      sp.shieldCharges--;
      sp.shieldCooldown = Engine.data.weapon.shield.rechargeTime;
      this.spawnFloatText(sp.pos.x, sp.pos.y - 30, 'SHIELD BLOCK', '#7dd3fc');
      return;
    }
    sp.hp -= amount;
    sp.invuln = 30;
  },

  endGame(result) {
    this.state = result;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('end-title').textContent = result === 'clear' ? 'MISSION CLEAR' : 'GAME OVER';
    document.getElementById('end-score').textContent = `SCORE: ${this.score}`;
    document.getElementById('retry-btn').onclick = () => this.showSelect();
  },

  updateHUD() {
    const sp = this.player;
    document.getElementById('hp-fill').style.width = `${Math.max(0, sp.hp / sp.hpMax) * 100}%`;
    document.getElementById('core-fill').style.width = `${(sp.core / sp.coreMax) * 100}%`;
    document.getElementById('level-label').textContent = `LV ${sp.level}`;
    document.getElementById('score-label').textContent = `SCORE ${this.score}`;
    document.getElementById('stage-label').textContent = `STAGE ${this.stageIndex + 1}`;
    document.getElementById('weapon-label').textContent = sp.weapons.map(w => Engine.data.weapon[w].name).join(' + ');
  },

  render() {
    const ctx = Engine.ctx;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, Engine.width, Engine.height);

    // 배경 스크롤 라인
    const speedMult = Engine.data.stage.speedMultipliers[this.speedLevel - 1];
    this.bgOffset = ((this.bgOffset || 0) + speedMult * 2) % 40;
    ctx.strokeStyle = 'rgba(120,160,255,0.08)';
    for (let y = -40 + this.bgOffset; y < Engine.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(Engine.width, y); ctx.stroke();
    }

    if (this.state !== 'playing') return;

    // 적
    for (const e of this.enemies) {
      ctx.fillStyle = e.color || e.def.color;
      ctx.beginPath();
      ctx.moveTo(e.pos.x, e.pos.y - e.radius);
      ctx.lineTo(e.pos.x + e.radius, e.pos.y + e.radius);
      ctx.lineTo(e.pos.x - e.radius, e.pos.y + e.radius);
      ctx.closePath(); ctx.fill();
    }

    // 보스
    if (this.boss) {
      ctx.fillStyle = this.boss.def.color;
      ctx.beginPath();
      ctx.arc(this.boss.pos.x, this.boss.pos.y, this.boss.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      // 보스 체력바
      const w = 300, h = 10, x = Engine.width / 2 - w / 2, y = 16;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#dc2626'; ctx.fillRect(x, y, w * Math.max(0, this.boss.hp / this.boss.maxHp), h);
    }

    // 총알
    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of this.enemyBullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.fill();
    }

    // 플레이어
    const sp = this.player;
    if (sp.invuln > 0 && Math.floor(this.frame / 3) % 2 === 0) {
      // 점멸
    } else {
      ctx.save();
      ctx.translate(sp.pos.x, sp.pos.y);
      ctx.fillStyle = sp.def.colors.primary;
      ctx.beginPath();
      ctx.moveTo(0, -sp.radius);
      ctx.lineTo(sp.radius, sp.radius);
      ctx.lineTo(0, sp.radius * 0.5);
      ctx.lineTo(-sp.radius, sp.radius);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = sp.def.coreColor;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (sp.shieldCharges > 0) {
        ctx.strokeStyle = 'rgba(125,211,252,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sp.pos.x, sp.pos.y, sp.radius + 8, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // 플로팅 텍스트
    ctx.textAlign = 'center';
    for (const f of this.floatTexts) {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = Math.min(1, f.life / 30);
      ctx.font = '14px monospace';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  },

  loop() {
    this.update();
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
};

window.Game = Game;
window.addEventListener('DOMContentLoaded', () => Game.start());
