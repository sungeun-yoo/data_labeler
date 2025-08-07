# 설정 파일 문서

이 문서는 이 디렉토리에 있는 JSON 설정 파일의 구조와 사용법을 설명합니다.

## `pose_config.json`

이 파일은 단일 클래스(일반적으로 사람)에 대한 키포인트 레이블과 스켈레톤 구조를 정의합니다.

- **`person`**: 사람 클래스의 루트 객체입니다.
  - **`labels`**: 각 문자열이 키포인트 이름인 문자열 배열입니다. 레이블의 순서는 각 키포인트의 인덱스를 정의하므로 중요합니다.
  - **`skeleton`**: 두 요소로 이루어진 배열의 배열로, 키포인트 간의 연결을 정의합니다. 각 내부 배열은 `labels` 배열의 인덱스로 지정된 두 키포인트를 연결하는 "뼈대"를 나타냅니다.

### 예시: `pose_config.json`
```json
{
  "person": {
    "labels": [
      "nose", "left_eye", "right_eye", ...
    ],
    "skeleton": [
      [0, 1], [0, 2], ...
    ]
  }
}
```

## `multi_cls_config.json`

이 파일은 각각 고유한 키포인트 및 스켈레톤 정의가 있는 여러 클래스를 지원합니다. 이를 통해 단일 구성에서 다양한 유형의 객체를 처리할 수 있습니다.

### 클래스 정의

루트 JSON 객체의 각 키는 클래스 이름(예: "person", "vehicle")을 나타냅니다. 값은 해당 클래스의 `labels` 및 `skeleton`을 포함하는 객체입니다.

### 키포인트 기반 클래스 (예: `person`)

키포인트가 있는 클래스의 경우 구조는 `pose_config.json`과 동일합니다.

### 바운딩 박스 기반 클래스 (예: `vehicle`)

바운딩 박스로만 표시되고 특정 키포인트가 없는 클래스의 경우 `labels` 및 `skeleton` 배열을 비워두어야 합니다.

```json
  "vehicle": {
    "labels": [],
    "skeleton": []
  }
```

이는 "vehicle" 클래스가 바운딩 박스를 통해 추적되며 키포인트 감지가 적용되지 않음을 나타냅니다.

### 예시: `multi_cls_config.json`
```json
{
  "person": {
    "labels": [
      "nose", "left_eye", "right_eye", ...
    ],
    "skeleton": [
      [0, 1], [0, 2], ...
    ]
  },
  "vehicle": {
    "labels": [],
    "skeleton": []
  }
}
```
