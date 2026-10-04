# V2 sprite atlas tooling

게임/Docker 런타임의 의존성이 아닌 오프라인 에셋 재가공 도구입니다.

```bash
python -m pip install -r tools/requirements.txt
python tools/build_entity_atlases.py
```

포함된원본PNG에서투명셀추출,nearest-neighbor64px정렬을수행합니다. 생성 API는호출하지 않습니다. 원본포즈 중복은sourcePoseIndices에공개하며 실제독립포즈수와프레임수를구분합니다. docs/assets-v2.md참고.

V3: build_combat_assets.py로포함원본을재가공하고compare_v2_rules.py --baseline /path/v2/infinite-arena로권위규칙회귀를비교합니다. latter는backend의존성이설치된Python이필요합니다. 자세한명령은docs/phase-v3.md입니다.

## 폴더 역할과 유지보수 안내

V2/V3 에셋 제작 및 V2 대비 서버 규칙 비교 도구. 일반 게임 실행에는 실행할 필요가 없습니다.

[프로젝트 루트 안내](../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [build_combat_assets.py](build_combat_assets.py) | V3 원본 PNG를 64px 효과 시트와 별도 투사체/입자 이미지로 변환합니다. 실행 시 출력 에셋을 덮어씁니다. |
| [build_entity_atlases.py](build_entity_atlases.py) | V2 원본 포즈를 발 기준 64px 프레임과 방향별 애니메이션 manifest로 변환합니다. 게임 규칙은 변경하지 않습니다. |
| [compare_v2_rules.py](compare_v2_rules.py) | 같은 RNG·입력으로 제공한 V2 기준 World와 현재 서버 상태를 비교합니다. 실시간 부하/FPS 측정이 아닙니다. |
| [requirements.txt](requirements.txt) | V2/V3 에셋 제작용 이미지 의존성. 원본 PNG 제작/정규화 작업에만 사용합니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.

## V5 음원 제작

`build_audio_assets.py`는 원본 화성·멜로디·파형을 NumPy로 생성하고 FFmpeg로 OGG/MP3 인코딩 및 실제 디코딩 검사를 수행합니다. `requirements-audio.txt`는 제작 전용 NumPy 의존성으로 게임 런타임에는 필요하지 않습니다.

```bash
pip install -r tools/requirements-audio.txt
python tools/build_audio_assets.py
```

FFmpeg(libvorbis, libmp3lame)를 PATH에 설치하세요. 생성은 audio 파일과 manifest를 덮어씁니다. 음색/구조는 도구에서, 재생 제한은 생성 specs에서 수정합니다. 외부 음원을 교체하면 출처·라이선스를 별도 확인하고 audio/README를 갱신하세요.
