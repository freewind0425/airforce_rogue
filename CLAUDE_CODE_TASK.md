# Claude 코드 작업 요청

이 ZIP은 Project K의 HTML5 Canvas MVP 코드 구조입니다.

## 요청
현재 코드 구조를 기준으로 사용자가 보유한 PNG 에셋을 지정 폴더에 배치하고, 로컬 실행 시 에셋이 정상 출력되도록 검토/수정해주세요.

## 수정 우선순위
1. 에셋 경로가 실제 폴더와 일치하는지 확인
2. `data/asset_manifest.json` 기준으로 로딩
3. HP바는 `ui_hp_frame.png` + `ui_hp_fill.png`로 동작
4. Wave는 `ui_wave_panel.png` 위에 코드 텍스트로 출력
5. Falcon/Vulcan Lv1~5 스프라이트 전환
6. 적/보스/무기/FX 이미지 적용
7. 에셋 누락 시 게임이 멈추지 않고 fallback 출력
8. 콘솔 에러 없이 실행

## 금지
- HP/Wave 숫자를 이미지로 처리하지 말 것
- 게임 전체를 새로 만들지 말 것
- 기존 파일명을 임의 변경하지 말 것
