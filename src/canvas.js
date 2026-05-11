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
    }

    const objects = state.annotationData[state.imageFiles[state.currentImageIndex]?.name]?.objects || [];
    const allClasses = state.config || [];

    objects.forEach((obj, index) => {
        if (obj.hidden) return;
        const isSelected = index === state.appState.selectedObjectIndex;
        const color = getColorForClass(obj.className, allClasses);

        if (obj.bbox) {
            drawBbox(obj, color, isSelected);
            if (isSelected) drawResizeHandles(obj.bbox, color);
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
    ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    ctx.setLineDash([]);
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

export function centerImage() {
    if (!state.currentImage) return;
    const scaleX = ui.canvas.width / state.currentImage.width;
    const scaleY = ui.canvas.height / state.currentImage.height;
    state.transform.scale = Math.min(scaleX, scaleY) * 0.95;
    state.transform.offsetX = (ui.canvas.width - state.currentImage.width * state.transform.scale) / 2;
    state.transform.offsetY = (ui.canvas.height - state.currentImage.height * state.transform.scale) / 2;
}
