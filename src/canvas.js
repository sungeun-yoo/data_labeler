import * as state from './state.js';
import { ui } from './ui.js';

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

const CLASS_COLORS = [
    'rgba(16, 185, 129, 0.8)', // Emerald
    'rgba(245, 158, 11, 0.8)',  // Amber
    'rgba(239, 68, 68, 0.8)',   // Red
    'rgba(139, 92, 246, 0.8)',  // Violet
    'rgba(59, 130, 246, 1)',    // Blue (selected)
];

let classColorMap = {};
let colorIndex = 0;

function getColorForClass(className) {
    if (!classColorMap[className]) {
        classColorMap[className] = CLASS_COLORS[colorIndex % CLASS_COLORS.length];
        colorIndex++;
    }
    return classColorMap[className];
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

    objects.forEach((obj, index) => {
        const isSelected = index === state.appState.selectedObjectIndex;
        if (obj.bbox) {
            drawBbox(obj, isSelected);
            if (isSelected) drawResizeHandles(obj.bbox);
        }
        if (obj.keypoints) {
            drawSkeleton(obj, isSelected);
            drawKeypoints(obj, index, isSelected);
        }
    });

    if (state.appState.mode === 'DRAWING_BBOX' && state.appState.currentBbox) {
        drawBbox({ bbox: state.appState.currentBbox }, true, true);
    }

    ctx.restore();
}

function drawBbox(obj, isSelected, isDrawing = false) {
    const [x1, y1, x2, y2] = obj.bbox;
    ui.ctx.lineWidth = isSelected ? 4 / state.transform.scale : 2 / state.transform.scale;
    ui.ctx.strokeStyle = isSelected ? 'rgba(59, 130, 246, 1)' : getColorForClass(obj.className);
    if (isDrawing) ui.ctx.setLineDash([5, 5]);
    ui.ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    ui.ctx.setLineDash([]);
}

function drawKeypoints(obj, objIndex, isSelected) {
    const pointRadius = 5 / state.transform.scale;
    obj.keypoints.forEach((point, ptIndex) => {
        if (point.visible === 0) return;
        ui.ctx.beginPath();
        ui.ctx.arc(point.x, point.y, pointRadius, 0, 2 * Math.PI);

        const isPointSelected = isSelected && ptIndex === state.appState.selectedPointIndex;

        if (isPointSelected) ui.ctx.fillStyle = 'rgba(236, 72, 153, 1)';
        else ui.ctx.fillStyle = point.visible === 2 ? 'rgba(52, 211, 153, 0.9)' : 'rgba(251, 191, 36, 0.9)';

        ui.ctx.fill();
    });
}

function drawSkeleton(obj, isSelected) {
    if (!obj.className || !state.config[obj.className]) return;

    const skeleton = state.config[obj.className].skeleton;
    const points = obj.keypoints;

    ui.ctx.lineWidth = 3 / state.transform.scale;
    ui.ctx.strokeStyle = isSelected ? 'rgba(96, 165, 250, 0.9)' : 'rgba(96, 165, 250, 0.5)';
    skeleton.forEach(([p1Index, p2Index]) => {
        const p1 = points[p1Index], p2 = points[p2Index];
        if (p1?.visible > 0 && p2?.visible > 0) {
            ui.ctx.beginPath();
            ui.ctx.moveTo(p1.x, p1.y);
            ui.ctx.lineTo(p2.x, p2.y);
            ui.ctx.stroke();
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

function drawResizeHandles(bbox) {
    const [x1, y1, x2, y2] = bbox;
    const handles = { tl: [x1, y1], tr: [x2, y1], bl: [x1, y2], br: [x2, y2] };
    const handleSize = 8 / state.transform.scale;
    ui.ctx.fillStyle = 'rgba(59, 130, 246, 1)';
    ui.ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ui.ctx.lineWidth = 1.5 / state.transform.scale;

    for (const key in handles) {
        const [x, y] = handles[key];
        ui.ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ui.ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    }
}

function drawCursorLabel(pos) {
    if (state.appState.mode !== 'EDITING_POSE' || state.appState.selectedPointIndex === -1) return;

    const label = state.config.labels[state.appState.selectedPointIndex];
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
