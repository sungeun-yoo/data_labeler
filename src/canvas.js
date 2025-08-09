import * as state from './state.js';
import { ui } from './ui.js';
import { getColorForClass } from './utils.js';

export function handleResize() {
    if (!ui.canvasWrapper) return;
    const rect = ui.canvasWrapper.getBoundingClientRect();
    ui.canvas.width = rect.width;
    ui.canvas.height = rect.height;
    if (state.currentImage) {
        centerImage();
        redrawCanvas();
    }
}

export function redrawCanvas() {
    if (!state.currentImage || !ui.ctx) return;
    const ctx = ui.ctx;
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

    ctx.translate(state.transform.offsetX, state.transform.offsetY);
    ctx.scale(state.transform.scale, state.transform.scale);

    ctx.drawImage(state.currentImage, 0, 0);

    if (state.appState.lastMouseWorldPos && !state.appState.isPanning) {
        drawGuideLines(state.appState.lastMouseWorldPos);
        drawCursorLabel(state.appState.lastMouseWorldPos);
    }

    const objects = state.annotationData[state.imageFiles[state.currentImageIndex]?.name]?.objects || [];
    const allClasses = Object.keys(state.config || {});

    objects.forEach((obj, index) => {
        if (obj.hidden) return; // Do not draw hidden objects
        const isSelected = index === state.appState.selectedObjectIndex;
        const color = getColorForClass(obj.className, allClasses);

        if (obj.bbox) {
            drawBbox(obj, color, isSelected);
            if (isSelected) drawResizeHandles(obj.bbox, color);
        }
        if (obj.keypoints) {
            drawSkeleton(obj, color, isSelected);
            drawKeypoints(obj, color, isSelected);
            if (isSelected && state.appState.selectedPointIndex === -1 && state.transform.scale > 0.5) {
                drawKeypointLabels(obj, color);
            }
        }
    });

    if (state.appState.mode === 'DRAWING_BBOX' && state.appState.currentBbox) {
        const color = getColorForClass(state.appState.currentClass, allClasses);
        drawBbox({ bbox: state.appState.currentBbox }, color, true, true);
    }

    ctx.restore();
}

function drawBbox(obj, color, isSelected, isDrawing = false) {
    const [x1, y1, x2, y2] = obj.bbox;
    const ctx = ui.ctx;
    ctx.lineWidth = isSelected ? 4 / state.transform.scale : 2 / state.transform.scale;
    ctx.strokeStyle = color;

    if (isDrawing) ctx.setLineDash([5, 5]);
    ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    ctx.setLineDash([]);
}

function drawKeypointLabels(obj, color) {
    const labels = state.config[obj.className].labels;
    const points = obj.keypoints;
    const ctx = ui.ctx;

    const fontSize = 12 / state.transform.scale;
    ctx.font = `${fontSize}px Inter`;
    ctx.fillStyle = color;

    points.forEach((point, index) => {
        if (point.visible > 0) {
            const label = labels[index];
            const x = point.x + 8 / state.transform.scale;
            const y = point.y + 4 / state.transform.scale;
            ctx.fillText(label, x, y);
        }
    });
}

function drawKeypoints(obj, color, isSelected) {
    const pointRadius = 5 / state.transform.scale;
    const ctx = ui.ctx;

    obj.keypoints.forEach((point, ptIndex) => {
        if (point.visible === 0) return;

        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, 2 * Math.PI);

        const isPointSelected = isSelected && ptIndex === state.appState.selectedPointIndex;

        ctx.fillStyle = isPointSelected ? '#FF00FF' : color;
        ctx.strokeStyle = isPointSelected ? '#FF00FF' : color;
        ctx.lineWidth = isSelected ? 2.5 / state.transform.scale : 1.5 / state.transform.scale;

        if (point.visible === 1) { // Occluded: draw hollow circle
            ctx.stroke();
        } else { // Visible (2) or other: draw filled circle
            ctx.fill();
        }
    });
}

function drawSkeleton(obj, color, isSelected) {
    if (!obj.className || !state.config[obj.className]) return;

    const skeleton = state.config[obj.className].skeleton;
    const points = obj.keypoints;
    const ctx = ui.ctx;

    ctx.lineWidth = isSelected ? 4 / state.transform.scale : 2 / state.transform.scale;
    ctx.strokeStyle = color;

    skeleton.forEach(([p1Index, p2Index]) => {
        const p1 = points[p1Index], p2 = points[p2Index];
        if (p1?.visible > 0 && p2?.visible > 0) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    });
}

function drawGuideLines(pos) {
    if (!state.currentImage) return;
    const ctx = ui.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.lineWidth = 1 / state.transform.scale;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(0, pos.y);
    ctx.lineTo(state.currentImage.width, pos.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pos.x, 0);
    ctx.lineTo(pos.x, state.currentImage.height);
    ctx.stroke();

    ctx.restore();
}

function drawResizeHandles(bbox, color) {
    const [x1, y1, x2, y2] = bbox;
    const handles = { tl: [x1, y1], tr: [x2, y1], bl: [x1, y2], br: [x2, y2] };
    const handleSize = 8 / state.transform.scale;
    ui.ctx.fillStyle = color;
    ui.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ui.ctx.lineWidth = 1.5 / state.transform.scale;

    for (const key in handles) {
        const [x, y] = handles[key];
        ui.ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ui.ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    }
}

function drawCursorLabel(pos) {
    if (state.appState.mode !== 'EDITING_POSE' || state.appState.selectedPointIndex === -1 || state.appState.selectedObjectIndex === -1) return;

    const obj = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[state.appState.selectedObjectIndex];
    if (!obj || !obj.className || !state.config[obj.className]) return;

    const labels = state.config[obj.className].labels;
    let label = labels[state.appState.selectedPointIndex];
    if (!label) return;

    const visibility = state.appState.isCtrlDown ? 1 : 2;
    label = `${label} : ${visibility}`;

    const ctx = ui.ctx;
    ctx.save();

    const fontSize = 14 / state.transform.scale;
    ctx.font = `bold ${fontSize}px Inter`;
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    const padding = 5 / state.transform.scale;

    const x = pos.x + 15 / state.transform.scale;
    const y = pos.y + 15 / state.transform.scale;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, textWidth + padding * 2, textHeight + padding * 2);

    ctx.fillStyle = 'white';
    ctx.fillText(label, x + padding, y + textHeight + padding / 2);

    ctx.restore();
}

export function centerImage() {
    if (!state.currentImage) return;
    const scaleX = ui.canvas.width / state.currentImage.width;
    const scaleY = ui.canvas.height / state.currentImage.height;
    state.transform.scale = Math.min(scaleX, scaleY) * 0.95;
    state.transform.offsetX = (ui.canvas.width - state.currentImage.width * state.transform.scale) / 2;
    state.transform.offsetY = (ui.canvas.height - state.currentImage.height * state.transform.scale) / 2;
}
