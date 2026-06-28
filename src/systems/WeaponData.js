// Project K - Weapon & Upgrade Card Data
// Weapon Identity Rule:
//  - 기본 무기(Falcon=Laser, Vulcan=Vulcan탄막)는 끝까지 형태를 유지한다.
//  - 무기 조합은 기본 무기를 대체하지 않고 부가 효과(추가 발사체 등)만 더한다.

export const SHIP_BASE_WEAPON = {
  falcon: 'laser',
  vulcan: 'vulcan'
};

// 카드 정의. type: 'weaponLevel' | 'combo' | 'stat'
// pool 안의 카드는 매 레벨업 시점에 3장 랜덤 추출되어 노출된다.
export function buildCardPool(player) {
  const pool = [];

  // 1) 무기 강화 카드 (기본 무기 레벨업 - 항상 등장 가능)
  pool.push({
    id: 'weaponDamage',
    type: 'weaponLevel',
    title: '공격력 강화',
    desc: '기본 무기의 공격력이 증가합니다.',
    apply: (p) => { p.stats.damageMul += 0.18; }
  });

  pool.push({
    id: 'weaponFireRate',
    type: 'weaponLevel',
    title: '연사속도 강화',
    desc: '기본 무기의 발사 속도가 증가합니다.',
    apply: (p) => { p.stats.fireRateMul += 0.15; }
  });

  // 2) 조합 무기 카드 - Missile (한 번만 획득 가능, 이후엔 안 보임)
  if (!player.combos.missile) {
    pool.push({
      id: 'comboMissile',
      type: 'combo',
      title: '미사일 연계',
      desc: '기본 무기는 그대로 유지되며, 일정 주기로 유도 미사일이 추가로 발사됩니다.',
      apply: (p) => { p.combos.missile = true; }
    });
  } else {
    // 이미 보유한 경우, 미사일 자체를 강화하는 카드로 대체 노출
    pool.push({
      id: 'comboMissileUp',
      type: 'combo',
      title: '미사일 강화',
      desc: '추가 발사되는 유도 미사일의 피해량과 발사 빈도가 증가합니다.',
      apply: (p) => {
        p.combos.missileDamageMul += 0.25;
        p.combos.missileCooldown = Math.max(0.7, p.combos.missileCooldown - 0.25);
      }
    });
  }

  // 3) 생존 카드
  pool.push({
    id: 'maxHp',
    type: 'stat',
    title: '최대 HP 증가',
    desc: '최대 HP가 증가합니다.',
    apply: (p) => {
      p.maxHp += 25;
      p.hp = Math.min(p.maxHp, p.hp + 25);
    }
  });

  pool.push({
    id: 'moveSpeed',
    type: 'stat',
    title: '이동속도 증가',
    desc: '기체의 이동 반응속도가 증가합니다.',
    apply: (p) => { p.stats.moveSmoothing = Math.min(0.95, p.stats.moveSmoothing + 0.08); }
  });

  return pool;
}

export function rollCards(player, count = 3) {
  const pool = buildCardPool(player);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
