# Project K - Code Handoff v1.3 (PNG 연동 + EXP/레벨업/콤보무기/정산 결과 적용)

## 실행
```bash
python -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속.

## 이번 버전에서 추가/변경된 것
- 보유 PNG 에셋 전부를 manifest 경로에 실제 배치 (assets/ 폴더 채움)
- `enemy_scout_01.png` 실제 에셋 적용 (interceptor 임시 대체 제거)
- Explosion/Hit FX를 5프레임 시퀀스로 교체 (단일 이미지 → 애니메이션)
- EXP 게이지 추가 (HP바 아래)
- 레벨업 버튼 (좌측 하단 상시 노출)
  - EXP가 expToNext에 도달할 때마다 누적 카운트 +1, 버튼에 숫자로 표시 (예: `LEVEL UP 3`)
  - 누르면 카드 3장 중 1개 선택, 누적된 횟수만큼 연속으로 진행
- 무기 조합 시스템 1세트 구현 (`src/systems/WeaponData.js`)
  - Weapon Identity Rule: 기본 무기(Falcon=Laser, Vulcan=Vulcan탄막)는 끝까지 형태 유지
  - "미사일 연계" 카드 선택 시, 기본 무기는 그대로 발사되며 주기적으로 유도 미사일이 추가 발사됨 (Boss > Elite > Nearest 우선순위)
- Wave 패널에 STAGE와 WAVE 숫자 동시 표시 (코드 렌더링)
- 정산 결과 화면(RESULT) 추가: "정산하고 로비로" 클릭 시 스테이지/웨이브/킬수/플레이타임 표시 후 확인하면 로비로 이동
- 업그레이드 버튼(`ui_button_upgrade.png`)은 manifest에 유지되나 현재 미사용 (보류)

## 핵심 구현
- `data/asset_manifest.json`으로 에셋 경로 관리
- `AssetLoader.js`에서 모든 이미지 사전 로딩 (실패 시 콘솔 경고 + null 폴백)
- HP바는 `ui_hp_frame + ui_hp_fill`로 구현
- Wave/Stage 숫자는 이미지가 아니라 코드 텍스트로 출력
- Falcon/Vulcan Lv1~5는 카드 선택(레벨업) 시 자동 교체
- Stage 5마다 `boss_stage05.png` 사용
- `src/systems/WeaponData.js`에 무기 조합/레벨업 카드 데이터 분리

## 알려진 제한사항 (다음 단계)
- 무기 조합은 "미사일 연계" 1세트만 구현됨. Plasma/Beam/Chain 등 추가 조합은 동일 패턴으로 데이터만 확장하면 됨
- 업그레이드 버튼(`ui_button_upgrade.png`) 용도는 보류 상태
