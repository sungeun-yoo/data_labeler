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
