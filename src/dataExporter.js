import * as state from './state.js';

export function exportAsLiveJson() {
    const currentFile = state.imageFiles[state.currentImageIndex];
    if (!currentFile) return '{}';
    const data = state.annotationData[currentFile.name] || {};
    return JSON.stringify(data, null, 2);
}

/**
 * YOLO detection format per line: class_idx x_center y_center width height
 * All coordinates normalized to [0, 1].
 */
export function exportDataAsYoloDetection(data) {
    if (!data || !data.objects || data.objects.length === 0) return '';

    const { image_width: w, image_height: h } = data;
    if (!w || !h) {
        console.error("Image size information is missing for", data.image_path);
        return '';
    }

    const classNames = state.config || [];

    const lines = data.objects.map(obj => {
        const classIndex = classNames.indexOf(obj.className);
        if (classIndex === -1 || !obj.bbox) return null;

        const [x1_raw, y1_raw, x2_raw, y2_raw] = obj.bbox;
        const x1 = Math.min(x1_raw, x2_raw);
        const y1 = Math.min(y1_raw, y2_raw);
        const x2 = Math.max(x1_raw, x2_raw);
        const y2 = Math.max(y1_raw, y2_raw);

        const boxWidth = x2 - x1;
        const boxHeight = y2 - y1;
        const xCenter = x1 + boxWidth / 2;
        const yCenter = y1 + boxHeight / 2;

        return [
            classIndex,
            (xCenter / w).toFixed(6),
            (yCenter / h).toFixed(6),
            (boxWidth / w).toFixed(6),
            (boxHeight / h).toFixed(6)
        ].join(' ');
    }).filter(line => line !== null);

    return lines.join('\n');
}

export function exportAsYoloDetection() {
    const currentFile = state.imageFiles[state.currentImageIndex];
    if (!currentFile) return '';

    const data = state.annotationData[currentFile.name];
    if (!data) return '';

    if (!data.image_width || !data.image_height) {
        return '오류: 이미지 크기 정보가 없어 YOLO 포맷을 생성할 수 없습니다.\n이미지를 다시 로드해 주세요.';
    }

    return exportDataAsYoloDetection(data);
}
