# YOLO Detection 라벨링 툴

이미지에 바운딩 박스를 그려 YOLO 객체 탐지 모델의 학습 데이터를 만드는 브라우저 기반 도구입니다.

**→ [사용자 가이드 보기](docs/guide.md)**

---

## 주요 기능

- 바운딩 박스 그리기 / 크기 조정 / 클래스 변경
- YOLO Detection 형식(`.txt`) 및 JSON으로 저장
- 저장 ZIP을 풀어 라벨 폴더를 선택하면 작업 재개
- 숫자키(1~9)로 클래스 선택과 그리기 모드 동시 진입
- 클래스별 색상 커스터마이징 / 단축키 커스터마이징

## 빠른 시작

```bash
cd data_labeler
python -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

> `index.html`을 직접 열면(`file://`) 동작하지 않습니다. 위 명령어로 실행하세요.

## Config 형식

클래스 이름을 나열한 JSON 배열 파일을 사용합니다.

```json
["person", "car", "truck", "bicycle", "motorcycle"]
```

`config/` 폴더에 예제 파일들이 있습니다.

## 출력 구조

```
annotations_YYYY-MM-DD.zip
├── json/      ← 전체 이미지 어노테이션 (작업 재개용)
└── labels/    ← YOLO 학습용 TXT (객체 있는 이미지만)
```

YOLO TXT 형식: `class_idx x_center y_center width height` (좌표 정규화)

## 프로젝트 구조

```
data_labeler/
├── index.html
├── styles.css
├── src/
│   ├── main.js          # 진입점
│   ├── state.js         # 전역 상태
│   ├── canvas.js        # 캔버스 렌더링
│   ├── events.js        # 이벤트 처리
│   ├── ui.js            # UI 렌더링
│   ├── file.js          # 파일 입출력
│   ├── dataExporter.js  # YOLO/JSON 내보내기
│   └── ...
├── config/              # 예제 Config 파일
└── docs/
    └── guide.md         # 사용자 가이드
```
