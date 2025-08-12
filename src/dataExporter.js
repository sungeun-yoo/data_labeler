import * as state from './state.js';

/**
 * Returns the annotation data for the current image as a formatted JSON string.
 */
export function exportAsLiveJson() {
    const currentFile = state.imageFiles[state.currentImageIndex];
    if (!currentFile) return '{}';

    const data = state.annotationData[currentFile.name] || {};
    return JSON.stringify(data, null, 2);
}

/**
 * Converts annotation data for a single image to YOLO pose format.
 * @param {object} data - The annotation data for a single image, including objects and image dimensions.
 * @returns {string} The YOLO formatted string. Returns an empty string if data is invalid.
 */
export function exportDataAsYoloPose(data) {
    if (!data || !data.objects || data.objects.length === 0) {
        return '';
    }

    const { image_width: w, image_height: h } = data;
    if (!w || !h) {
        console.error("Image size information is missing for", data.image_path, "- cannot generate YOLO format.");
        return ''; // Return empty string if image dimensions are missing
    }

    const classNames = Object.keys(state.config || {});
    const maxKeypoints = Math.max(0, ...Object.values(state.config || {}).map(c => c.labels.length));

    const lines = data.objects.map(obj => {
        const classIndex = classNames.indexOf(obj.className);
        if (classIndex === -1 || !obj.bbox) {
            return null;
        }

        // Normalize bbox coordinates to ensure [x_min, y_min, x_max, y_max]
        const [x1_raw, y1_raw, x2_raw, y2_raw] = obj.bbox;
        const x1 = Math.min(x1_raw, x2_raw);
        const y1 = Math.min(y1_raw, y2_raw);
        const x2 = Math.max(x1_raw, x2_raw);
        const y2 = Math.max(y1_raw, y2_raw);

        const boxWidth = x2 - x1;
        const boxHeight = y2 - y1;
        const xCenter = x1 + boxWidth / 2;
        const yCenter = y1 + boxHeight / 2;

        const bboxStr = [
            (xCenter / w).toFixed(6),
            (yCenter / h).toFixed(6),
            (boxWidth / w).toFixed(6),
            (boxHeight / h).toFixed(6)
        ].join(' ');

        const keypoints = obj.keypoints || [];
        let keypointsStr = keypoints.map(p => {
            const normX = p.x / w;
            const normY = p.y / h;
            // Ensure visibility is an integer, defaulting to 0 if undefined
            const visibility = p.visible !== undefined ? parseInt(p.visible, 10) : 0;
            return `${normX.toFixed(6)} ${normY.toFixed(6)} ${visibility}`;
        }).join(' ');

        const numToPad = maxKeypoints - keypoints.length;
        if (numToPad > 0) {
            const padding = Array(numToPad).fill('0 0 0').join(' ');
            keypointsStr = keypointsStr ? `${keypointsStr} ${padding}` : padding;
        }

        return `${classIndex} ${bboxStr}${keypointsStr ? ' ' + keypointsStr : ''}`;
    }).filter(line => line !== null);

    return lines.join('\n');
}


/**
 * Converts the annotation data for the current image to YOLO pose format for the UI viewer.
 * Format per line: class_idx x_center y_center width height x1 y1 v1 x2 y2 v2 ...
 * All coordinates are normalized.
 */
export function exportAsYoloPose() {
    const currentFile = state.imageFiles[state.currentImageIndex];
    if (!currentFile) return '';

    const data = state.annotationData[currentFile.name];
    if (!data) return ''; // No data for this file

    // Provide a user-facing error in the UI if dimensions are missing
    if (!data.image_width || !data.image_height) {
        return '오류: 이미지 크기 정보가 없어 YOLO 포맷을 생성할 수 없습니다.\n이미지를 다시 로드해 주세요.';
    }

    return exportDataAsYoloPose(data);
}

/**
 * Converts annotation data for a single image to MF_YOLO pose format.
 * @param {object} data - The annotation data for a single image.
 * @returns {string} The MF_YOLO formatted string.
 */
function exportDataAsMfYoloPose(data) {
    if (!data || !data.objects || data.objects.length === 0) {
        return '';
    }

    const { image_width: w, image_height: h } = data;
    if (!w || !h) {
        console.error("Image size information is missing for", data.image_path, "- cannot generate MF_YOLO format.");
        return '';
    }

    const classNames = Object.keys(state.config || {});
    const maxKeypoints = Math.max(0, ...Object.values(state.config || {}).map(c => c.labels.length));

    const lines = data.objects.map(obj => {
        const classIndex = classNames.indexOf(obj.className);
        if (classIndex === -1 || !obj.bbox) {
            return null;
        }

        const [x1_raw, y1_raw, x2_raw, y2_raw] = obj.bbox;
        const x1 = Math.min(x1_raw, x2_raw);
        const y1 = Math.min(y1_raw, y2_raw);
        const x2 = Math.max(x1_raw, x2_raw);
        const y2 = Math.max(y1_raw, y2_raw);

        const boxWidth = x2 - x1;
        const boxHeight = y2 - y1;
        const xCenter = x1 + boxWidth / 2;
        const yCenter = y1 + boxHeight / 2;

        const bboxStr = [
            (xCenter / w).toFixed(6),
            (yCenter / h).toFixed(6),
            (boxWidth / w).toFixed(6),
            (boxHeight / h).toFixed(6)
        ].join(' ');

        const keypoints = obj.keypoints || [];
        let keypointsStr = keypoints.map(p => {
            if (boxWidth <= 0 || boxHeight <= 0) {
                return '0.000000 0.000000 0';
            }
            const normX = (p.x - x1) / boxWidth;
            const normY = (p.y - y1) / boxHeight;
            const visibility = p.visible !== undefined ? parseInt(p.visible, 10) : 0;

            // Clamp coordinates to be within [0, 1] as per definition
            const clampedX = Math.max(0, Math.min(1, normX));
            const clampedY = Math.max(0, Math.min(1, normY));

            return `${clampedX.toFixed(6)} ${clampedY.toFixed(6)} ${visibility}`;
        }).join(' ');

        const numToPad = maxKeypoints - keypoints.length;
        if (numToPad > 0) {
            const padding = Array(numToPad).fill('0 0 0').join(' ');
            keypointsStr = keypointsStr ? `${keypointsStr} ${padding}` : padding;
        }

        return `${classIndex} ${bboxStr}${keypointsStr ? ' ' + keypointsStr : ''}`;
    }).filter(line => line !== null);

    return lines.join('\n');
}

/**
 * Converts the annotation data for the current image to MF_YOLO pose format for the UI viewer.
 */
export function exportAsMfYoloPose() {
    const currentFile = state.imageFiles[state.currentImageIndex];
    if (!currentFile) return '';

    const data = state.annotationData[currentFile.name];
    if (!data) return '';

    if (!data.image_width || !data.image_height) {
        return '오류: 이미지 크기 정보가 없어 MF_YOLO 포맷을 생성할 수 없습니다.\n이미지를 다시 로드해 주세요.';
    }

    return exportDataAsMfYoloPose(data);
}
