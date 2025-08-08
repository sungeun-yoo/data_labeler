import * as state from './state.js';
import { ui, updateAllUI, updateBboxInfoUI, updateKeypointListUI, updateInfoBarUI } from './ui.js';
import { redrawCanvas, centerImage, handleResize } from './canvas.js';
import { getMousePos, screenToWorld, isPointInBbox, getResizeHandleAt, showNotification } from './utils.js';
import { navigateImage, saveAllAnnotationsToZip, handleConfigFile, handleDirectorySelection } from './file.js';
import { showDeleteConfirmModal, isModalOpen, hideDeleteConfirmModal } from './modal.js';
import { getKeyToActionMap } from './shortcutManager.js';

function updateCursor() {
    if (state.appState.isPanning) {
        ui.canvas.style.cursor = 'grabbing';
        return;
    }

    if (state.appState.isAltDown) {
        ui.canvas.style.cursor = 'grab';
        return;
    }

    if (state.appState.mode === 'EDITING_POSE' || state.appState.mode === 'DRAWING_BBOX') {
        ui.canvas.style.cursor = 'crosshair';
        return;
    }

    ui.canvas.style.cursor = 'pointer';
}

export function initializeEventListeners() {
    ui.btnLoadConfig.addEventListener('click', () => ui.configLoader.click());
    ui.configLoader.addEventListener('change', handleConfigFile);
    ui.btnLoadDir.addEventListener('click', () => ui.dirLoader.click());
    ui.dirLoader.addEventListener('change', handleDirectorySelection);
    ui.btnSave.addEventListener('click', saveAllAnnotationsToZip);
    ui.btnPrev.addEventListener('click', () => navigateImage(-1));
    ui.btnNext.addEventListener('click', () => navigateImage(1));
    ui.btnAddObject.addEventListener('click', () => enterBboxDrawingMode());

    ui.classSelector.addEventListener('change', (e) => {
        state.appState.currentClass = e.target.value;
        updateAllUI(); // Ensure color indicator updates
    });

    ui.canvas.addEventListener('mousedown', handleMouseDown);
    ui.canvas.addEventListener('mousemove', handleMouseMove);
    ui.canvas.addEventListener('mouseup', handleMouseUp);
    ui.canvas.addEventListener('mouseout', handleMouseUp);
    ui.canvas.addEventListener('wheel', handleWheelZoom);
    ui.canvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    window.addEventListener('beforeunload', (e) => {
        if (state.hasChanges()) {
            // Prevent default behavior to show the confirmation dialog
            e.preventDefault();
            // Required for Chrome
            e.returnValue = '';
        }
    });

    // Event delegation for dynamic elements
    ui.objectListWrapper.addEventListener('click', (e) => {
        const item = e.target.closest('.object-item');
        if (item && item.dataset.objectId) {
            selectObject(parseInt(item.dataset.objectId));
        }
    });

    ui.detailsWrapper.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('#btnDeleteObject');
        if (deleteButton) {
            deleteSelectedObject();
            return;
        }

        const addBboxButton = e.target.closest('button[data-action="add-bbox"]');
        if (addBboxButton) {
            enterBboxDrawingMode(state.appState.selectedObjectIndex);
            return;
        }

        const keypointItem = e.target.closest('.keypoint-item');
        if (keypointItem && keypointItem.dataset.keypointId && e.target.tagName !== 'INPUT') {
            state.appState.selectedPointIndex = parseInt(keypointItem.dataset.keypointId);
            updateAllUI();
            redrawCanvas();
        }
    });

    ui.detailsWrapper.addEventListener('change', (e) => {
        if (e.target.id === 'details-class-selector') {
            changeObjectClass(e.target.value);
        }
    });
}

function handleMouseDown(e) {
    if (!state.config || state.currentImageIndex < 0) return;

    if (e.altKey) {
        state.appState.isPanning = true;
        state.appState.lastPanPoint = { x: e.clientX, y: e.clientY };
        updateCursor();
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
            const labels = state.config[selectedObject.className].labels;
            const nextPointIndex = (state.appState.selectedPointIndex + 1) % labels.length;
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

function changeObjectClass(newClassName) {
    if (state.appState.selectedObjectIndex === -1) return;

    state.pushHistory(JSON.parse(JSON.stringify(state.annotationData[state.imageFiles[state.currentImageIndex].name].objects)));

    const obj = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[state.appState.selectedObjectIndex];
    obj.className = newClassName;

    // Re-initialize keypoints based on the new class
    const newLabels = state.config[newClassName].labels;
    obj.keypoints = newLabels.map(labelName => ({ name: labelName, x: 0, y: 0, visible: 0 }));

    state.appState.selectedPointIndex = -1; // Reset selected point
    updateAllUI();
    redrawCanvas();
}

function handleMouseMove(e) {
    const pos = getMousePos(ui.canvas, e);
    const worldPos = screenToWorld(pos.x, pos.y, state.transform);
    state.appState.lastMouseWorldPos = worldPos;

    updateCursor();

    if (state.appState.isPanning) {
        const dx = e.clientX - state.appState.lastPanPoint.x;
        const dy = e.clientY - state.appState.lastPanPoint.y;
        state.transform.offsetX += dx;
        state.transform.offsetY += dy;
        state.appState.lastPanPoint = { x: e.clientX, y: e.clientY };
    } else if (state.appState.isResizingBbox) {
        const obj = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[state.appState.selectedObjectIndex];
        const bbox = obj.bbox;
        switch (state.appState.resizeHandle) {
            case 'tl': bbox[0] = worldPos.x; bbox[1] = worldPos.y; break;
            case 'tr': bbox[2] = worldPos.x; bbox[1] = worldPos.y; break;
            case 'bl': bbox[0] = worldPos.x; bbox[3] = worldPos.y; break;
            case 'br': bbox[2] = worldPos.x; bbox[3] = worldPos.y; break;
        }
        updateBboxInfoUI(obj);
    } else if (state.appState.mode === 'DRAWING_BBOX' && state.appState.drawingBboxStartPoint) {
        state.appState.currentBbox[2] = worldPos.x;
        state.appState.currentBbox[3] = worldPos.y;
    } else if (state.appState.isDraggingPoint) {
        const { objIndex, ptIndex } = state.appState.draggingPointInfo;
        const obj = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[objIndex];
        const point = obj.keypoints[ptIndex];
        point.x = worldPos.x;
        point.y = worldPos.y;
        updateKeypointListUI(obj);
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
            const newClass = state.appState.currentClass;
            const newObject = {
                id: `obj_${Date.now()}`,
                className: newClass,
                bbox: [...state.appState.currentBbox],
                keypoints: state.config[newClass].labels.map(labelName => ({ name: labelName, x: 0, y: 0, visible: 0 }))
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
    updateCursor();
    redrawCanvas();
}

async function handleKeyDown(e) {
    if (e.repeat || e.target.tagName === 'INPUT') return;
    if (isModalOpen() || ui.shortcutModal.classList.contains('hidden') === false) {
        if (e.key === 'Escape') {
            hideDeleteConfirmModal();
            ui.shortcutModal.classList.add('hidden');
        }
        return;
    }

    if (e.key === 'Alt') {
        state.appState.isAltDown = true;
        updateCursor();
        return;
    }
    if (e.altKey) return;

    const keyMap = getKeyToActionMap();
    const action = keyMap[e.key.toLowerCase()];

    if (!action) return;

    const requiresModifier = action === 'UNDO' || action === 'SAVE';
    const hasModifier = e.ctrlKey || e.metaKey;

    // If action requires modifier, it must be present.
    // If action does not require modifier, it must be absent.
    if (requiresModifier !== hasModifier) return;

    e.preventDefault();
    await executeAction(action);
}

async function executeAction(action) {
    if (action.startsWith('SELECT_CLASS_')) {
        const classIndex = parseInt(action.split('_').pop());
        changeClassWithNumber(classIndex);
        return;
    }

    switch (action) {
        case 'PREV_IMAGE': await navigateImage(-1); break;
        case 'NEXT_IMAGE': await navigateImage(1); break;
        case 'PREV_LABEL': navigateLabel(-1); break;
        case 'NEXT_LABEL': navigateLabel(1); break;
        case 'ADD_OBJECT': enterBboxDrawingMode(); break;
        case 'DELETE_OBJECT': deleteSelectedObject(); break;
        case 'CANCEL_ACTION':
            state.appState.mode = 'IDLE';
            state.appState.selectedObjectIndex = -1;
            updateAllUI();
            redrawCanvas();
            break;
        case 'UNDO': undo(); break;
        case 'SAVE': saveAllAnnotationsToZip(); break;
    }
}

function navigateLabel(direction) {
    if (state.appState.selectedObjectIndex === -1) return;

    const obj = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[state.appState.selectedObjectIndex];
    if (!obj || !obj.className || !state.config[obj.className]) return;

    const labels = state.config[obj.className].labels;
    const numLabels = labels.length;
    if (numLabels === 0) return;

    let nextIndex = state.appState.selectedPointIndex + direction;

    if (nextIndex >= numLabels) {
        nextIndex = 0;
    } else if (nextIndex < 0) {
        nextIndex = numLabels - 1;
    }

    state.appState.selectedPointIndex = nextIndex;
    updateAllUI();
    redrawCanvas();
}

function changeClassWithNumber(classIndex) {
    if (!state.config) return;
    const classes = Object.keys(state.config);
    if (classIndex > classes.length) return;

    const newClassName = classes[classIndex - 1];

    // Per user request, number shortcuts should only change the default class.
    state.appState.currentClass = newClassName;
    updateAllUI(); // This will update the main class selector dropdown.
    showNotification(`기본 클래스 변경됨: ${newClassName}`, 'info', ui);
}


function handleKeyUp(e) {
    if (e.key === 'Alt') {
        state.appState.isAltDown = false;
        updateCursor();
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
    updateCursor();
}

export function selectObject(objIndex) {
    if (state.appState.selectedObjectIndex !== objIndex) {
        state.appState.selectedObjectIndex = objIndex;
        state.appState.selectedPointIndex = -1;
        state.appState.mode = 'EDITING_POSE';
        updateAllUI();
        redrawCanvas();
        updateCursor();
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
    updateCursor();
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
        updateCursor();
    } else {
        showNotification('더 이상 취소할 내용이 없습니다.', 'info', ui);
    }
}
