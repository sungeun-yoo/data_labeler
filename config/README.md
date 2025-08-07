[한국어 문서](./README.ko.md)

# Configuration File Documentation

This document explains the structure and usage of the JSON configuration files in this directory.

## `pose_config.json`

This file defines the keypoint labels and skeleton structure for a single class, typically a person.

- **`person`**: The root object for the person class.
  - **`labels`**: An array of strings, where each string is a keypoint name. The order of the labels is important as it defines the index for each keypoint.
  - **`skeleton`**: An array of two-element arrays, defining the connections between keypoints. Each inner array represents a "bone" connecting two keypoints, specified by their indices from the `labels` array.

### Example: `pose_config.json`
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

This file supports multiple classes, each with its own keypoint and skeleton definition. This allows for handling different types of objects in a single configuration.

### Defining Classes

Each key in the root JSON object represents a class name (e.g., "person", "vehicle"). The value is an object containing the `labels` and `skeleton` for that class.

### Keypoint-based Classes (e.g., `person`)

For classes with keypoints, the structure is the same as in `pose_config.json`.

### Bounding Box-based Classes (e.g., `vehicle`)

For classes that are represented only by a bounding box and have no specific keypoints, the `labels` and `skeleton` arrays should be empty.

```json
  "vehicle": {
    "labels": [],
    "skeleton": []
  }
```

This indicates that the "vehicle" class is tracked via a bounding box, and no keypoint detection will be applied.

### Example: `multi_cls_config.json`
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
