# Upload Guide - Player Aircraft From Asset Sheet v0.7

## GitHub에 올릴 위치

SVG 파일:
```text
assets/aircraft/player_sheet/svg/
```

PNG 파일:
```text
assets/aircraft/player_sheet/png/
```

데이터 파일:
```text
data/aircraft/player_aircraft_sheet_assets.json
```

미리보기:
```text
docs/preview_player_aircraft.html
```

## 게임 코드에서 사용할 경로 예시

```javascript
const playerSprite = "./assets/aircraft/player_sheet/svg/falcon_lv5.svg";
// 또는 PNG 직접 사용
const playerSpritePng = "./assets/aircraft/player_sheet/png/falcon_lv5.png";
```

## 주의
이번 SVG는 순수 벡터 드로잉이 아니라, 생성된 에셋 시트에서 잘라낸 PNG를 SVG 안에 포함한 방식입니다.
즉, 게임에 바로 넣을 수 있는 SVG 파일이지만 확대 편집용 벡터 원화는 아닙니다.
