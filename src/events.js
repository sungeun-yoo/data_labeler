import * as state from './state.js';
import { ui, updateAllUI, updateBboxInfoUI, updateKeypointListUI, updateInfoBarUI } from './ui.js';
import { redrawCanvas, centerImage, handleResize } from './canvas.js';
import { getMousePos, screenToWorld, isPointInBbox, getResizeHandleAt, showNotification } from './utils.js';
import { navigateImage, saveCurrentAnnotation, handleConfigFile, handleDirectorySelection } from './file.js';
import { showDeleteConfirmModal } from './modal.js';

export function initializeEventListeners() {
    ui.btnLoadConfig.addEventListener('click', () => ui.configLoader.click());
    ui.configLoader.addEventListener('change', handleConfigFile);
    ui.btnLoadDir.addEventListener('click', () => ui.dirLoader.click());
    ui.dirLoader.addEventListener('change', handleDirectorySelection);
    ui.btnSave.addEventListener('click', saveCurrentAnnotation);
    ui.btnPrev.addEventListener('click', () => navigateImage(-1));
    ui.btnNext.addEventListener('click', () => navigateImage(1));
    ui.btnAddObject.addEventListener('click', () => enterBboxDrawingMode());

    ui.canvas.addEventListener('mousedown', handleMouseDown);
    ui.canvas.addEventListener('mousemove', handleMouseMove);
    ui.canvas.addEventListener('mouseup', handleMouseUp);
    ui.canvas.addEventListener('mouseout', handleMouseUp);
    ui.canvas.addEventListener('wheel', handleWheelZoom);
    ui.canvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
}

function handleMouseDown(e) {
    if (!state.config || state.currentImageIndex < 0) return;

    if (e.altKey) {
        state.appState.isPanning = true;
        state.appState.lastPanPoint = { x: e.clientX, y: e.clientY };
        ui.canvas.style.cursor = 'grabbing';
        redrawCanvas();
        return;
    }

    const pos = getMousePos(ui.canvas, e);
    const worldPos = screenToWorld(pos.x, pos.y, state.transform);

    if (state.appState.mode === 'DRAWING_BBOX') {
        state.appState.drawingBboxStartPoint = worldPos;
        state.appState.currentBbox = [worldPos.x, worldPos.y, worldPos.x, worldPos.y];
        return;
    }

    const objects = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects;
    const clickRadius = 8 / state.transform.scale;

    if (state.appState.selectedObjectIndex !== -1) {
        const selectedObject = objects[state.appState.selectedObjectIndex];
        const handle = getResizeHandleAt(worldPos, selectedObject.bbox, state.transform);
        if (handle) {
            state.pushHistory(JSON.parse(JSON.stringify(objects)));
            state.appState.isResizingBbox = true;
            state.appState.resizeHandle = handle;
            return;
        }
    }

    if (state.appState.mode === 'EDITING_POSE' && state.appState.selectedObjectIndex !== -1) {
        const selectedObject = objects[state.appState.selectedObjectIndex];
        for (let j = 0; j < selectedObject.keypoints.length; j++) {
            const p = selectedObject.keypoints[j];
            if (p.visible > 0 && Math.hypot(p.x - worldPos.x, p.y - worldPos.y) < clickRadius) {
                state.pushHistory(JSON.parse(JSON.stringify(objects)));
                state.appState.isDraggingPoint = true;
                state.appState.draggingPointInfo = { objIndex: state.appState.selectedObjectIndex, ptIndex: j };
                state.appState.selectedPointIndex = j;
                updateAllUI();
                redrawCanvas();
                return;
            }
        }
        if (state.appState.selectedPointIndex !== -1 && isPointInBbox(worldPos, selectedObject.bbox)) {
            state.pushHistory(JSON.parse(JSON.stringify(objects)));
            const pointToUpdate = selectedObject.keypoints[state.appState.selectedPointIndex];
            pointToUpdate.x = worldPos.x;
            pointToUpdate.y = worldPos.y;
            pointToUpdate.visible = 2;
            const nextPointIndex = (state.appState.selectedPointIndex + 1) % state.config.labels.length;
            state.appState.selectedPointIndex = nextPointIndex;
            updateAllUI();
            redrawCanvas();
            return;
        }
    }

    for (let i = objects.length - 1; i >= 0; i--) {
        if (isPointInBbox(worldPos, objects[i].bbox)) {
            if (state.appState.selectedObjectIndex !== i) {
                selectObject(i);
            }
            state.appState.isDraggingBbox = true;
            return;
        }
    }

    if (state.appState.selectedObjectIndex !== -1) {
        state.appState.selectedObjectIndex = -1;
        state.appState.selectedPointIndex = -1;
        state.appState.mode = 'IDLE';
        updateAllUI();
        redrawCanvas();
    }
}

function handleMouseMove(e) {
    const pos = getMousePos(ui.canvas, e);
    const worldPos = screenToWorld(pos.x, pos.y, state.transform);
    state.appState.lastMouseWorldPos = worldPos;

    if (state.appState.isPanning) {
        const dx = e.clientX - state.appState.lastPanPoint.x;
        const dy = e.clientY - state.appState.lastPanPoint.y;
        state.transform.offsetX += dx;
        state.transform.offsetY += dy;
        state.appState.lastPanPoint = { x: e.clientX, y: e.clientY };
    } else if (state.appState.isResizingBbox) {
        const bbox = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[state.appState.selectedObjectIndex].bbox;
        switch (state.appState.resizeHandle) {
            case 'tl': bbox[0] = worldPos.x; bbox[1] = worldPos.y; break;
            case 'tr': bbox[2] = worldPos.x; bbox[1] = worldPos.y; break;
            case 'bl': bbox[0] = worldPos.x; bbox[3] = worldPos.y; break;
            case 'br': bbox[2] = worldPos.x; bbox[3] = worldPos.y; break;
        }
        updateBboxInfoUI();
    } else if (state.appState.mode === 'DRAWING_BBOX' && state.appState.drawingBboxStartPoint) {
        state.appState.currentBbox[2] = worldPos.x;
        state.appState.currentBbox[3] = worldPos.y;
    } else if (state.appState.isDraggingPoint) {
        const { objIndex, ptIndex } = state.appState.draggingPointInfo;
        const point = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[objIndex].keypoints[ptIndex];
        point.x = worldPos.x;
        point.y = worldPos.y;
        updateKeypointListUI();
    }

    redrawCanvas();
}

function handleMouseUp(e) {
    if (state.appState.mode === 'DRAWING_BBOX' && state.appState.currentBbox) {
        let newObjectIndex = -1;
        if (state.appState.selectedObjectIndex !== -1) {
            const obj = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[state.appState.selectedObjectIndex];
            obj.bbox = [...state.appState.currentBbox];
            newObjectIndex = state.appState.selectedObjectIndex;
        } else {
            const newObject = {
                id: `obj_${Date.now()}`,
                bbox: [...state.appState.currentBbox],
                keypoints: state.config.labels.map(labelName => ({ name: labelName, x: 0, y: 0, visible: 0 }))
            };
            state.annotationData[state.imageFiles[state.currentImageIndex].name].objects.push(newObject);
            newObjectIndex = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects.length - 1;
        }

        selectObject(newObjectIndex);
        state.appState.selectedPointIndex = 0; // Start with the first keypoint

        state.appState.drawingBboxStartPoint = null;
        state.appState.currentBbox = null;
        state.pushHistory(JSON.parse(JSON.stringify(state.annotationData[state.imageFiles[state.currentImageIndex].name].objects)));
        updateAllUI();
    }

    if (e.type === 'mouseout') state.appState.lastMouseWorldPos = null;

    state.appState.isPanning = false;
    state.appState.isDraggingPoint = false;
    state.appState.isDraggingBbox = false;
    state.appState.isResizingBbox = false;
    state.appState.resizeHandle = null;
    if (!state.appState.isAltDown) ui.canvas.style.cursor = 'crosshair';
    redrawCanvas();
}

async function handleKeyDown(e) {
    if (e.repeat) return;
    if (e.key === 'Alt') {
        state.appState.isAltDown = true;
        if (!state.appState.isPanning) ui.canvas.style.cursor = 'grab';
    }
    if (e.altKey || e.target.tagName === 'INPUT') return;
    switch (e.key.toLowerCase()) {
        case 'a': e.preventDefault(); enterBboxDrawingMode(); break;
        case 's': e.preventDefault(); saveCurrentAnnotation(); break;
        case 'z': if (e.ctrlKey || e.metaKey) { e.preventDefault(); undo(); } break;
        case 'escape':
            e.preventDefault();
            state.appState.mode = 'IDLE';
            state.appState.selectedObjectIndex = -1;
            updateAllUI();
            redrawCanvas();
            break;
        case 'delete': case 'backspace':
            e.preventDefault();
            deleteSelectedObject();
            break;
        case 'arrowright': await navigateImage(1); break;
        case 'arrowleft': await navigateImage(-1); break;
    }
}

function handleKeyUp(e) {
    if (e.key === 'Alt') {
        state.appState.isAltDown = false;
        if (!state.appState.isPanning) ui.canvas.style.cursor = 'crosshair';
    }
}

function handleWheelZoom(e) {
    e.preventDefault();
    const pos = getMousePos(ui.canvas, e);
    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);
    const worldPos = screenToWorld(pos.x, pos.y, state.transform);

    state.transform.scale = Math.max(0.05, Math.min(20, state.transform.scale * zoom));
    state.transform.offsetX = pos.x - worldPos.x * state.transform.scale;
    state.transform.offsetY = pos.y - worldPos.y * state.transform.scale;

    redrawCanvas();
    updateInfoBarUI();
}

export function enterBboxDrawingMode(forObjectIndex = -1) {
    state.appState.mode = 'DRAWING_BBOX';
    if (forObjectIndex === -1) state.appState.selectedObjectIndex = -1;
    else state.appState.selectedObjectIndex = forObjectIndex;
    updateAllUI();
}

export function selectObject(objIndex) {
    if (state.appState.selectedObjectIndex !== objIndex) {
        state.appState.selectedObjectIndex = objIndex;
        state.appState.selectedPointIndex = -1;
        state.appState.mode = 'EDITING_POSE';
        updateAllUI();
        redrawCanvas();
    }
}

export function deleteSelectedObject() {
    if (state.appState.selectedObjectIndex === -1) return;
    showDeleteConfirmModal();
}

export function performDeleteObject() {
    if (state.appState.selectedObjectIndex === -1) return;
    state.pushHistory(JSON.parse(JSON.stringify(state.annotationData[state.imageFiles[state.currentImageIndex].name].objects)));
    const objects = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects;
    objects.splice(state.appState.selectedObjectIndex, 1);
    state.appState.selectedObjectIndex = -1;
    state.appState.mode = 'IDLE';
    updateAllUI();
    redrawCanvas();
    showNotification('객체 삭제됨', 'success', ui);
}

function undo() {
    const restoredObjects = state.undoHistory();
    if (restoredObjects) {
        const filename = state.imageFiles[state.currentImageIndex].name;
        state.annotationData[filename].objects = JSON.parse(JSON.stringify(restoredObjects));

        state.resetAppState();
        updateAllUI();
        redrawCanvas();
        showNotification('실행 취소', 'success', ui);
    } else {
        showNotification('더 이상 취소할 내용이 없습니다.', 'info', ui);
    }
}
