# V1 에셋 출처·가공

## 출처와 적용 범위

이번 환경 PNG는 이 요청에서 Imagegen의 내장 이미지 생성 기능으로 제작했습니다. 외부 상용 타일팩·게임 리소스·캐릭터 파일을 가져오지 않았습니다. 따라서 별도 외부 에셋팩 라이선스를 적용한 것이라고 주장하지 않습니다. 생성 이미지의 이용 조건은 해당 생성 서비스의 이용 조건을 따릅니다. AI 생성물의 독점권이나 타인 권리 부재를 보증하는 라이선스 문서로 해석하지 않습니다.

기존 Noto Sans KR 폰트와 Vue/Phaser 의존성은 변경하지 않았으며 각 패키지 라이선스가 유지됩니다. 이미지 사용 범위는 지형·식생·유적·환경 효과이며 캐릭터/몬스터/전투/UI에는 신규 그림을 적용하지 않았습니다.

## 원본과 가공

원본:frontend/public/assets/environment/source-atlas-v1.png,RGBA1254×1254. 내장 Imagegen으로 생성한 실제 파일입니다. 자동 생성은 정확한1024px 요청을 그대로 따르지 않아 원본 크기를 검사하고 사분면 비율로 셀을 추출했습니다.

scripts/build_environment_assets.py는 셀 추출,이웃 셀 작은 조각 제거,nearest-neighbor 리사이즈,지형 명도 감쇄,32px 변형/경계 타일 생성,수관 영역 추출을 수행합니다. 그림자와 먼지는 코드로 만든 단순 기능 마스크입니다. 코드 도형을 반복하는 것으로 전체 환경 그래픽을 완성한 것이 아닙니다.

```bash
pip install -r scripts/requirements-assets.txt
python scripts/build_environment_assets.py
```

일반 Docker 빌드/게임 실행에는 Pillow나 이미지 생성 API가 필요하지 않습니다. 완성된 PNG가 포함되어 있습니다. manifest-v1.json에 크기/경로/인덱스를 기록했습니다.

## 생성 프롬프트

정확한 전체 입력은 imagegen-prompt-v1.txt에 있습니다. 아래는 요약입니다.

실제 원본 생성에는 다음 명세를 사용했습니다. 기능 텍스처는 별도 이미지 생성 요청 없이 스크립트로 만들었습니다.

> Production top-down pixel art environment atlas, exactly4columns by4rows, no text/labels/characters/UI. Ruined dark fantasy woodland, ancient blue-grey mossy ruins, upper-left lighting, muted greens/brown/slate. Row1 opaque seamless ground:grass,soil,pavers,leaf litter. Row2 transparent details:grass/flowers,leaves/pebbles,roots/fern,masonry fragments. Row3 transparent props:fir,oak,dead tree,boulder. Row4 transparent ruins:pillar,wall,fallen column/rubble,arch. All sprites stay inside their cell with gutters, sharp clusters, no antialiasing, no watermark. Request1024×1024 and transparent background.

생성된 arch 셀은 이번 맵에서 사용하지 않아 개별 arch PNG는 배포하지 않습니다. 다른 셀은 본체·수관·저층 파편 등에 사용합니다. 생성 원본에는 해당 셀이 남아 있지만 런타임에는 원본 atlas 자체를 로드하지 않습니다.
