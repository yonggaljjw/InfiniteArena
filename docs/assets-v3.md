# V3 PNG 에셋 명세·출처

내장 Imagegen으로새로생성한실제투명PNG입니다. 외부게임·상용이펙트팩을가져오지않았으며별도외부팩라이선스를적용했다고주장하지 않습니다. 생성서비스의이용조건이적용됩니다. 기존환경·캐릭터·폰트/의존성라이선스는변경하지않았습니다. 전체프롬프트는imagegen-prompt-v3.txt입니다.

| frontend/public 기준 경로 | 실제 크기 | 적용 |
|---|---|---|
| assets/effects/source-v3.png | 1254×1254 RGBA | 생성원본,런타임미로딩 |
| assets/effects/combat-v3.png | 256×256 RGBA | 64px셀16개,효과공유시트 |
| assets/projectiles/own-bolt-v3.png | 32×16 | 본인기본금색화살 |
| assets/projectiles/hostile-bolt-v3.png | 32×16 | 타인의붉은창/외곽선 |
| assets/projectiles/spread-bolt-v3.png | 32×16 | 본인확산탄청록색갈래 |
| assets/projectiles/orbit-blade-v3.png | 32×32 | 회전무기초승달 |
| assets/particles/shard-v3.png | 12×12 | 피격파편 |
| assets/particles/ember-v3.png | 8×8 | 확보한불씨,현재효과에서는미사용 |
| assets/effects/manifest-v3.json | JSON | 프레임순서/원본크기 |

시트행/열4×4,각64px. Muzzle[4,12],Hit[5,13],MonsterDeath[8,14],PlayerDeath[9],Experience[10],LevelUp[11,15]. 플레이어사망/EXP는1개이미지에시간에따른크기·이동·알파를적용합니다. 독립적으로여러그림을제작한프레임애니메이션이라고주장하지않습니다. 총구/명중/몬스터소멸/레벨업은실제2원본포즈를사용합니다.

생성원이정확한요청해상도를따르지않아원본을검사하고4×4비율로셀추출했습니다. 미세한투명프린지를제거한뒤nearest-neighbor로축소하고고정캔버스중심에배치했습니다. 원본의빛윤곽이셀끝에닿은부분은잘려있어수작업VFX와차이가있습니다. PhaserpixelArt와roundPixels는그대로유지합니다.

```bash
python -m pip install -r tools/requirements.txt
python tools/build_combat_assets.py
```

Pillow는재가공용이며게임/Docker실행에는필요하지 않습니다. 정상화PNG가전부포함되어있습니다. PNG실패때만작은도형텍스처를사용해실행을유지하고경고를출력합니다. 이대체경로는V3그래픽완성본이아닙니다.
