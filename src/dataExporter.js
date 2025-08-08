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
 * Converts all annotation data to the COCO format and returns it as a JSON string.
 */
export function exportAsCocoFormat() {
    if (!state.config || Object.keys(state.annotationData).length === 0) {
        return JSON.stringify({
            info: { description: 'Pose Estimation Labeling Tool Export' },
            licenses: [],
            images: [],
            annotations: [],
            categories: []
        }, null, 2);
    }

    const categories = Object.keys(state.config).map((className, i) => ({
        id: i + 1,
        name: className,
        supercategory: 'common',
        keypoints: state.config[className].labels,
        skeleton: state.config[className].skeleton,
    }));

    const images = [];
    const annotations = [];
    let annotationId = 1;

    for (let i = 0; i < state.imageFiles.length; i++) {
        const file = state.imageFiles[i];
        const imageData = state.annotationData[file.name];
        if (!imageData) continue;

        images.push({
            id: i + 1,
            width: imageData.image_width,
            height: imageData.image_height,
            file_name: file.name,
            license: 1,
            date_captured: new Date().toISOString(),
        });

        imageData.objects.forEach((obj, objIndex) => {
            const category = categories.find(c => c.name === obj.className);
            if (!category) return;

            // Bbox: [x_min, y_min, width, height]
            const bbox = [
                obj.bbox[0],
                obj.bbox[1],
                obj.bbox[2] - obj.bbox[0],
                obj.bbox[3] - obj.bbox[1],
            ];

            // Keypoints: [x1, y1, v1, x2, y2, v2, ...]
            const keypoints = obj.keypoints.flatMap(p => [p.x, p.y, p.visible]);
            const numKeypoints = obj.keypoints.filter(p => p.visible > 0).length;

            annotations.push({
                id: annotationId++,
                image_id: i + 1,
                category_id: category.id,
                segmentation: [], // Not supported in this tool
                area: bbox[2] * bbox[3], // width * height
                bbox: bbox,
                iscrowd: 0,
                num_keypoints: numKeypoints,
                keypoints: keypoints,
            });
        });
    }

    const cocoData = {
        info: {
            description: 'Pose Estimation Labeling Tool Export',
            year: new Date().getFullYear(),
            version: '1.0',
            date_created: new Date().toISOString(),
        },
        licenses: [{ id: 1, name: 'Default License', url: '' }],
        categories: categories,
        images: images,
        annotations: annotations,
    };

    return JSON.stringify(cocoData, null, 2);
}

/**
 * Converts the annotation data for the current image to YOLO pose format.
 * Format per line: class_idx x_center y_center width height x1 y1 v1 x2 y2 v2 ...
 * All coordinates are normalized.
 */
export function exportAsYoloPose() {
    const currentFile = state.imageFiles[state.currentImageIndex];
    if (!currentFile) return '';

    const data = state.annotationData[currentFile.name];
    if (!data || !data.objects || data.objects.length === 0) return '';

    const { image_width: w, image_height: h } = data;
    if (!w || !h) {
        return '오류: 이미지 크기 정보가 없어 YOLO 포맷을 생성할 수 없습니다.\n이미지를 다시 로드해 주세요.';
    }

    const classNames = Object.keys(state.config || {});
    const maxKeypoints = Math.max(0, ...Object.values(state.config || {}).map(c => c.labels.length));

    const lines = data.objects.map(obj => {
        const classIndex = classNames.indexOf(obj.className);
        if (classIndex === -1 || !obj.bbox) {
            return null;
        }

        const [x1, y1, x2, y2] = obj.bbox;
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
            return `${normX.toFixed(6)} ${normY.toFixed(6)} ${p.visible}`;
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
