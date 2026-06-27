// engine.js - Project K Engine (prototype core)
// Sprite 기반 데이터 구조를 canvas 도형으로 임시 렌더링 (Unity 이식 전 HTML5 프로토타입)

const Engine = {
  data: {},
  canvas: null,
  ctx: null,
  width: 480,
  height: 720,

  async loadData() {
    const files = ['aircraft', 'weapon', 'enemy', 'stage', 'boss'];
    const entries = await Promise.all(
      files.map(f => fetch(`src/data/${f}.json`).then(r => r.json()))
    );
    files.forEach((f, i) => (this.data[f] = entries[i]));
  },

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }
};

class Vec {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
}

class Player {
  constructor(aircraftId) {
    const def = Engine.data.aircraft[aircraftId];
    this.def = def;
    this.pos = new Vec(Engine.width / 2, Engine.height - 100);
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;
    this.hpMax = def.baseStats.hp;
    this.hp = this.hpMax;
    this.speed = def.baseStats.speed;
    this.fireRate = def.baseStats.fireRate;
    this.damageMult = def.baseStats.damage;
    this.weapons = [def.defaultWeapon];
    this.cooldowns = {};
    this.core = 0; // Level Up Core 게이지
    this.coreMax = 100;
    this.shieldCharges = 0;
    this.shieldCooldown = 0;
    this.invuln = 0;
    this.radius = 18;
  }

  applyLevel() {
    const g = this.def.growthPerLevel;
    const lv = this.level - 1;
    this.hpMax = this.def.baseStats.hp + g.hp * lv;
    this.speed = this.def.baseStats.speed + g.speed * lv;
    this.fireRate = this.def.baseStats.fireRate + g.fireRate * lv;
    this.damageMult = this.def.baseStats.damage + g.damage * lv;
  }

  gainXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext && this.level < this.def.maxLevel) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.round(this.xpToNext * 1.35);
      this.applyLevel();
      this.hp = this.hpMax; // 레벨업 시 전체회복
    }
  }

  addCore(amount) {
    this.core += amount;
    if (this.core >= this.coreMax) {
      this.core = 0;
      this.gainXP(this.xpToNext); // Core 가득 차면 즉시 레벨업 보너스
      Game.spawnFloatText(this.pos.x, this.pos.y - 30, 'CORE FULL! LEVEL UP', '#ffe066');
    }
  }

  tryEvolve(newWeaponId) {
    // 보유 무기와 조합되는지 확인
    for (const w of this.weapons) {
      const wdef = Engine.data.weapon[w];
      if (wdef.evolvesWith && wdef.evolvesWith[newWeaponId]) {
        const evolved = wdef.evolvesWith[newWeaponId];
        this.weapons = this.weapons.filter(x => x !== w);
        this.weapons.push(evolved);
        Game.spawnFloatText(this.pos.x, this.pos.y - 50, `EVOLVE: ${Engine.data.weapon[evolved].name}`, '#7dffd6');
        return true;
      }
    }
    if (!this.weapons.includes(newWeaponId)) {
      if (this.weapons.length >= 2) this.weapons.shift();
      this.weapons.push(newWeaponId);
    }
    return false;
  }
}

class Bullet {
  constructor(pos, vel, damage, color, owner, opts = {}) {
    this.pos = pos; this.vel = vel; this.damage = damage; this.color = color;
    this.owner = owner; // 'player' | 'enemy'
    this.radius = opts.radius || 4;
    this.homing = opts.homing || false;
    this.turnRate = opts.turnRate || 0;
    this.dead = false;
  }
  update(target) {
    if (this.homing && target) {
      const dx = target.pos.x - this.pos.x, dy = target.pos.y - this.pos.y;
      const ang = Math.atan2(dy, dx);
      const curAng = Math.atan2(this.vel.y, this.vel.x);
      let diff = ang - curAng;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const newAng = curAng + Math.max(-this.turnRate, Math.min(this.turnRate, diff));
      const speed = Math.hypot(this.vel.x, this.vel.y);
      this.vel.x = Math.cos(newAng) * speed;
      this.vel.y = Math.sin(newAng) * speed;
    }
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    if (this.pos.y < -20 || this.pos.y > Engine.height + 20 || this.pos.x < -20 || this.pos.x > Engine.width + 20) {
      this.dead = true;
    }
  }
}

class Enemy {
  constructor(defId, x, y, stageMult) {
    const def = Engine.data.enemy[defId];
    this.def = def;
    this.id = defId;
    this.pos = new Vec(x, y);
    this.hp = def.hp * stageMult;
    this.maxHp = this.hp;
    this.speed = def.speed;
    this.t = 0;
    this.fireTimer = Math.random() * (def.fireInterval || 60);
    this.radius = 16;
    this.dead = false;
  }
  update() {
    this.t++;
    switch (this.def.pattern) {
      case 'straight_down':
        this.pos.y += this.speed;
        break;
      case 'zigzag':
        this.pos.y += this.speed * 0.8;
        this.pos.x += Math.sin(this.t * 0.07) * 3;
        break;
      case 'hover_shoot':
        if (this.pos.y < 160) this.pos.y += this.speed;
        break;
      case 'dive':
        this.pos.y += this.speed * 1.3;
        this.pos.x += Math.sin(this.t * 0.04) * 1.5;
        break;
    }
    if (this.pos.y > Engine.height + 40) this.dead = true;
  }
}

class Boss {
  constructor(defId, stageMult) {
    const def = Engine.data.boss[defId];
    this.def = def;
    this.pos = new Vec(Engine.width / 2, -80);
    this.hp = def.hp * stageMult;
    this.maxHp = this.hp;
    this.t = 0;
    this.fireTimer = 0;
    this.radius = 46;
    this.dead = false;
    this.entered = false;
  }
  currentPhase() {
    const ratio = this.hp / this.maxHp;
    return this.def.phases.find(p => ratio > p.hpAbove) || this.def.phases[this.def.phases.length - 1];
  }
  update() {
    this.t++;
    if (!this.entered) {
      this.pos.y += 1.2;
      if (this.pos.y >= 110) this.entered = true;
    } else {
      this.pos.x = Engine.width / 2 + Math.sin(this.t * 0.015) * 140;
    }
  }
}

window.Engine = Engine;
window.Vec = Vec;
window.Player = Player;
window.Bullet = Bullet;
window.Enemy = Enemy;
window.Boss = Boss;
