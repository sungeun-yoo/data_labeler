// --- 전역 상태 및 설정 ---
export let config = null;
export let imageFiles = [];
export let jsonFiles = [];
export let currentImageIndex = -1;
export let currentImage = null;
export let annotationData = {};
export let history = [];
export let currentHistoryIndex = -1;

export const appState = {
    mode: 'IDLE', // IDLE, DRAWING_BBOX, EDITING_POSE
    selectedObjectIndex: -1,
    selectedPointIndex: -1,
    drawingBboxStartPoint: null,
    currentBbox: null,
    isPanning: false,
    isDraggingPoint: false,
    isDraggingBbox: false,
    isResizingBbox: false,
    resizeHandle: null,
    lastPanPoint: { x: 0, y: 0 },
    draggingPointInfo: { objIndex: -1, ptIndex: -1 },
    lastMouseWorldPos: null,
    isAltDown: false,
    currentClass: null,
    hoveredPointInfo: null, // { type: 'keypoint'/'bbox', objIndex, ptIndex }
};

export let transform = { scale: 1, offsetX: 0, offsetY: 0 };

export function setConfig(newConfig) {
    config = newConfig;
}

export function setImageFiles(files) {
    imageFiles = files;
}

export function setJsonFiles(files) {
    jsonFiles = files;
}

export function setCurrentImageIndex(index) {
    currentImageIndex = index;
}

export function setCurrentImage(image) {
    currentImage = image;
}

export function setAnnotationData(data) {
    annotationData = data;
}

export function updateAnnotationData(filename, data) {
    annotationData[filename] = data;
}

export function resetHistory() {
    history = [];
    currentHistoryIndex = -1;
}

export function pushHistory(state) {
    if (currentHistoryIndex < history.length - 1) {
        history.splice(currentHistoryIndex + 1);
    }
    history.push(state);
    if (history.length > 31) { // Cap history size
        history.shift();
    }
    currentHistoryIndex = history.length - 1;
}

export function undoHistory() {
    if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        return history[currentHistoryIndex];
    }
    return null;
}

export function canUndo() {
    return currentHistoryIndex > 0;
}

export function hasChanges() {
    return history.length > 1;
}

export function resetAppState() {
    appState.mode = 'IDLE';
    appState.selectedObjectIndex = -1;
    appState.selectedPointIndex = -1;
    appState.drawingBboxStartPoint = null;
    appState.currentBbox = null;
    appState.lastMouseWorldPos = null;
    appState.isResizingBbox = false;
    appState.resizeHandle = null;
}
