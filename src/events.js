import * as state from './state.js';
import { ui, updateAllUI, updateBboxInfoUI, updateKeypointListUI, updateInfoBarUI, switchSidebar, switchLabelViewTab, updateImageListUI } from './ui.js';
import { redrawCanvas, centerImage, handleResize } from './canvas.js';
import { getMousePos, screenToWorld, isPointInBbox, getResizeHandleAt, showNotification, copyToClipboard, downloadFile } from './utils.js';
import { navigateImage, saveAllAnnotationsToZip, handleConfigFile, handleImageDirectorySelection, handleLabelDirectorySelection, handleSapiensDirectorySelection } from './file.js';
import { showDeleteConfirmModal, isModalOpen, hideDeleteConfirmModal, showLabelFormatModal } from './modal.js';
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
    ui.btnLoadImageDir.addEventListener('click', () => ui.imageDirLoader.click());
    ui.imageDirLoader.addEventListener('change', handleImageDirectorySelection);

    // New unified label loader
    ui.btnOpenLabelModal.addEventListener('click', showLabelFormatModal);
    ui.labelDirLoader.addEventListener('change', handleLabelDirectorySelection);
    ui.sapiensDirLoader.addEventListener('change', handleSapiensDirectorySelection);

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
        if (!item) return;

        const objectId = parseInt(item.dataset.objectId);
        const actionButton = e.target.closest('[data-action]');

        if (actionButton) {
            e.stopPropagation(); // Prevent selection when clicking a button
            const action = actionButton.dataset.action;
            const objects = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects;
            const object = objects[objectId];

            if (action === 'toggle-visibility') {
                state.pushHistory(JSON.parse(JSON.stringify(objects)));
                object.hidden = !object.hidden;
                updateAllUI();
                redrawCanvas();
            } else if (action === 'delete-object') {
                // Temporarily select the object to delete, as deleteSelectedObject depends on it
                state.appState.selectedObjectIndex = objectId;
                deleteSelectedObject();
            }
        } else {
            selectObject(objectId);
        }
    });

    ui.detailsWrapper.addEventListener('click', (e) => {

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

    // Left Sidebar
    ui.labelSidebarToggle.addEventListener('click', () => switchSidebar('label'));
    ui.imageSidebarToggle.addEventListener('click', () => switchSidebar('image'));

    // Resizer
    ui.leftSidebarResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        ui.leftSidebarContainer.classList.add('is-resizing');
        document.addEventListener('mousemove', handleResizeSidebar);
        document.addEventListener('mouseup', stopResizeSidebar);
    });

    function handleResizeSidebar(e) {
        const newWidth = e.clientX;
        if (newWidth > 200 && newWidth < 800) { // Min/max width
            const sidebarWidth = `${newWidth}px`;
            ui.labelSidebar.style.setProperty('--sidebar-width', sidebarWidth);
            ui.imageSidebar.style.setProperty('--sidebar-width', sidebarWidth);
            ui.leftSidebarContainer.style.setProperty('--sidebar-width', sidebarWidth);
        }
    }

    function stopResizeSidebar() {
        ui.leftSidebarContainer.classList.remove('is-resizing');
        document.removeEventListener('mousemove', handleResizeSidebar);
        document.removeEventListener('mouseup', stopResizeSidebar);
    }

    // Image List Panel
    ui.imageListContentWrapper.addEventListener('click', (e) => {
        const item = e.target.closest('.image-list-item');
        if (item && item.dataset.imageIndex) {
            const targetIndex = parseInt(item.dataset.imageIndex);
            const direction = targetIndex - state.currentImageIndex;
            navigateImage(direction);
        }
    });

    ui.viewModeIcon.addEventListener('click', () => {
        ui.imageListContentWrapper.classList.remove('list-view');
        ui.viewModeIcon.classList.add('active');
        ui.viewModeList.classList.remove('active');
        updateImageListUI();
    });

    ui.viewModeList.addEventListener('click', () => {
        ui.imageListContentWrapper.classList.add('list-view');
        ui.viewModeList.classList.add('active');
        ui.viewModeIcon.classList.remove('active');
        updateImageListUI();
    });

    ui.thumbnailSizeSlider.addEventListener('input', (e) => {
        ui.imageListContentWrapper.style.setProperty('--thumbnail-size', `${e.target.value}px`);
    });


    // Label Viewer Panel
    ui.btnLiveJson.addEventListener('click', () => switchLabelViewTab('live'));
    ui.btnYoloPose.addEventListener('click', () => switchLabelViewTab('yolo'));
    ui.btnMfYoloPose.addEventListener('click', () => switchLabelViewTab('mf_yolo'));

    ui.btnCopyLive.addEventListener('click', () => copyToClipboard(ui.liveJsonOutput.textContent, ui));
    ui.btnDownloadLive.addEventListener('click', () => {
        const filename = state.imageFiles[state.currentImageIndex]?.name.replace(/\.[^/.]+$/, "") + ".json";
        downloadFile(ui.liveJsonOutput.textContent, filename || 'annotation.json');
    });

    ui.btnCopyYolo.addEventListener('click', () => copyToClipboard(ui.yoloPoseOutput.textContent, ui));
    ui.btnDownloadYolo.addEventListener('click', () => {
        const filename = state.imageFiles[state.currentImageIndex]?.name.replace(/\.[^/.]+$/, "") + ".txt";
        downloadFile(ui.yoloPoseOutput.textContent, filename || 'annotation.txt');
    });

    ui.btnCopyMfYolo.addEventListener('click', () => copyToClipboard(ui.mfYoloPoseOutput.textContent, ui));
    ui.btnDownloadMfYolo.addEventListener('click', () => {
        const filename = state.imageFiles[state.currentImageIndex]?.name.replace(/\.[^/.]+$/, "") + "_mf.txt";
        downloadFile(ui.mfYoloPoseOutput.textContent, filename || 'annotation_mf.txt');
    });

    // Icon Modal
    ui.appIcon.addEventListener('click', () => {
        ui.iconModal.classList.remove('hidden');
        setTimeout(() => ui.iconModal.classList.add('visible'), 10);
    });

    ui.iconModal.addEventListener('click', (e) => {
        if (e.target === ui.iconModal) {
            ui.iconModal.classList.remove('visible');
            setTimeout(() => ui.iconModal.classList.add('hidden'), 300); // Wait for transition to finish
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
            if (pointToUpdate) {
                pointToUpdate.x = worldPos.x;
                pointToUpdate.y = worldPos.y;
                pointToUpdate.visible = state.appState.isCtrlDown ? 1 : 2;
            }
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
            // Dragging logic removed as per user request
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

    updateInfoBarUI();
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
        const imgWidth = state.currentImage.width;
        const imgHeight = state.currentImage.height;

        // Clamp worldPos to image boundaries
        const clampedX = Math.max(0, Math.min(worldPos.x, imgWidth));
        const clampedY = Math.max(0, Math.min(worldPos.y, imgHeight));

        switch (state.appState.resizeHandle) {
            case 'tl': bbox[0] = clampedX; bbox[1] = clampedY; break;
            case 'tr': bbox[2] = clampedX; bbox[1] = clampedY; break;
            case 'bl': bbox[0] = clampedX; bbox[3] = clampedY; break;
            case 'br': bbox[2] = clampedX; bbox[3] = clampedY; break;
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
        const [x1, y1, x2, y2] = state.appState.currentBbox;
        const width = Math.abs(x1 - x2);
        const height = Math.abs(y1 - y2);

        if (width < 10 || height < 10) {
            showNotification('BBox는 10x10 픽셀보다 커야 합니다.', 'error', ui);
            state.appState.currentBbox = null;
            state.appState.drawingBboxStartPoint = null;
            state.appState.mode = 'IDLE'; // Or back to a default state
            updateAllUI();
            redrawCanvas();
        } else {
            const imgWidth = state.currentImage.width;
            const imgHeight = state.currentImage.height;

            const normalizedBbox = [
                Math.max(0, Math.min(x1, x2)),
                Math.max(0, Math.min(y1, y2)),
                Math.min(imgWidth, Math.max(x1, x2)),
                Math.min(imgHeight, Math.max(y1, y2))
            ];

            let newObjectIndex = -1;
            if (state.appState.selectedObjectIndex !== -1) {
                const obj = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[state.appState.selectedObjectIndex];
                obj.bbox = normalizedBbox;
                newObjectIndex = state.appState.selectedObjectIndex;
            } else {
                const newClass = state.appState.currentClass;
                const newObject = {
                    id: `obj_${Date.now()}`,
                    className: newClass,
                    bbox: normalizedBbox,
                    keypoints: state.config[newClass].labels.map(labelName => ({ name: labelName, x: 0, y: 0, visible: 0 }))
                };
                state.annotationData[state.imageFiles[state.currentImageIndex].name].objects.push(newObject);
                newObjectIndex = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects.length - 1;
            }

            selectObject(newObjectIndex);

            const newObject = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[newObjectIndex];
            if (newObject.keypoints && newObject.keypoints.length > 0) {
                state.appState.selectedPointIndex = 0; // Start with the first keypoint
                state.appState.mode = 'EDITING_POSE';
            } else {
                state.appState.selectedPointIndex = -1;
                state.appState.mode = 'IDLE';
            }

            state.pushHistory(JSON.parse(JSON.stringify(state.annotationData[state.imageFiles[state.currentImageIndex].name].objects)));
            updateAllUI();
        }

        // Reset drawing state regardless of outcome
        state.appState.drawingBboxStartPoint = null;
        state.appState.currentBbox = null;
    }

    if (e.type === 'mouseout') state.appState.lastMouseWorldPos = null;

    state.appState.isPanning = false;
    state.appState.isDraggingPoint = false;
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
    if (e.key === 'Control') {
        state.appState.isCtrlDown = true;
        redrawCanvas();
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

    state.appState.currentClass = newClassName;
    showNotification(`${newClassName} 클래스로 객체 그리기를 시작합니다.`, 'info', ui);
    enterBboxDrawingMode();
}


function handleKeyUp(e) {
    if (e.key === 'Alt') {
        state.appState.isAltDown = false;
        updateCursor();
    }
    if (e.key === 'Control') {
        state.appState.isCtrlDown = false;
        redrawCanvas();
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
