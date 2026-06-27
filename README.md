# GO AIR RAID — Project K Engine Prototype

Project K Engine 기반 첫 게임 **GO AIR RAID**의 HTML5 플레이 가능 프로토타입입니다.
기획 문서(GDD/Art Bible/Asset Spec)를 바탕으로 핵심 시스템을 구현했으며, 이후 Unity 이식을 고려해
`Engine`(공용 로직) / `Game`(게임 데이터·룰)을 분리한 구조로 작성했습니다.

▶ **플레이**: [GitHub Pages 링크](#) (저장소 Settings → Pages 에서 `main` 브랜치 활성화 후 자동 생성)

## 구현된 핵심 시스템 (GDD 기준)

- 수동 조작 Top-View Shooter (방향키/WASD, 마우스/터치 드래그)
- 5종 무기: 직선 캐논 / 레이저 / 유도탄 / 체인건 / 실드
- 무기 조합 진화 (예: 직선 캐논 + 레이저 → 트윈 빔 캐논)
- Falcon(밸런스형) / Vulcan(중장갑형) 기체, 컬러·코어 스펙은 Art Bible 기준
- 기체 레벨 1~5 성장 (HP/속도/공속/공격력 자동 스케일)
- Level Up Core 게이지 시스템 (게이지 충전 시 즉시 레벨업)
- 5 Stage 구성, Stage 5마다 Boss 등장 (페이즈별 패턴 전환)
- 배속 컨트롤 x1~x5 (키보드 숫자키 1~5 또는 화면 하단 버튼)
- 전 데이터는 `src/data/*.json`으로 외부화 (Engine/Game 데이터 분리)

## 폴더 구조

```
GoAirRaid/
├─ index.html              # 진입점
├─ src/
│  ├─ engine.js             # Project K Engine 공용 클래스 (Player/Enemy/Boss/Bullet)
│  ├─ main.js               # GO AIR RAID 게임 룰/루프
│  └─ data/                 # JSON 데이터 (기체/무기/적/스테이지/보스)
│     ├─ aircraft.json
│     ├─ weapon.json
│     ├─ enemy.json
│     ├─ stage.json
│     └─ boss.json
├─ docs_source/             # 원본 기획 문서 (GDD, Art Bible, Asset Spec)
├─ CLAUDE.md                # 개발 규칙 (원본 유지)
└─ README.md
```

## 로컬 실행

JSON을 `fetch`로 불러오므로 `index.html`을 더블클릭하면 브라우저 보안 정책(CORS)에 막혀 데이터가
로드되지 않습니다. 로컬 서버를 띄워서 실행해 주세요.

```bash
# Python 3
python3 -m http.server 8000
# 이후 브라우저에서 http://localhost:8000 접속

# 또는 Node.js
npx serve .
```

## GitHub Pages로 바로 플레이하기

1. 이 저장소를 GitHub에 push
2. 저장소 **Settings → Pages → Build and deployment → Branch: main / (root)** 선택
3. 몇 분 후 `https://<계정>.github.io/<저장소명>/` 에서 바로 플레이 가능 (서버 설정 불필요)

## 다음 단계 (Unity 이식 전 TODO)

- [ ] Sprite 에셋 교체 (현재는 색상 도형으로 임시 렌더링, `Asset_Specification.md` 구조 참고)
- [ ] 연구소 / 일일미션 / 기체도감 UI
- [ ] 사운드/이펙트
- [ ] 모바일 출시용 입력 최적화 (Google Play 목표)
- [ ] `src/data/*.json` → Unity ScriptableObject 또는 동일 JSON 파서로 이식

## 라이선스

`LICENSE` 파일 참고 (MIT). 프로젝트 자체 IP(이름/설정 등)는 별도 협의.
