import * as state from './state.js';
import { redrawCanvas } from './canvas.js';
import { formatBytes } from './utils.js';

export const ui = {};

export function initUI() {
    Object.assign(ui, {
        btnLoadConfig: document.getElementById('btnLoadConfig'),
        configLoader: document.getElementById('configLoader'),
        btnLoadDir: document.getElementById('btnLoadDir'),
        dirLoader: document.getElementById('dirLoader'),
        btnSave: document.getElementById('btnSave'),
        btnPrev: document.getElementById('btnPrev'),
        btnNext: document.getElementById('btnNext'),
        imageProgress: document.getElementById('imageProgress'),
        canvas: document.getElementById('mainCanvas'),
        ctx: document.getElementById('mainCanvas').getContext('2d'),
        canvasWrapper: document.getElementById('canvas-wrapper'),
        canvasLoader: document.getElementById('canvas-loader'),
        btnAddObject: document.getElementById('btnAddObject'),
        configHelp: document.getElementById('config-help'),
        objectListWrapper: document.getElementById('object-list-wrapper'),
        detailsWrapper: document.getElementById('details-wrapper'),
        modeIndicator: document.getElementById('mode-indicator'),
        toastPopup: document.getElementById('toast-popup'),
        classSelectorWrapper: document.getElementById('class-selector-wrapper'),
        classSelector: document.getElementById('class-selector'),
    });

    ui.btnPrev.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`;
    ui.btnNext.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>`;
    ui.canvasLoader.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p>이미지 로딩 중...</p>`;
    document.querySelector('footer').innerHTML = `<div class="flex items-center gap-x-4 gap-y-1 flex-wrap"><p id="imageName" class="font-semibold truncate">N/A</p><p id="imageDimensions" style="color: var(--md-sys-color-on-surface-variant);"></p><p id="imageSize" style="color: var(--md-sys-color-on-surface-variant);"></p></div><div class="flex items-center gap-4"><p id="notificationMessage" class="transition-colors duration-300"></p><p id="zoomLevel" style="color: var(--md-sys-color-on-surface-variant);">Zoom: 100%</p></div>`;
    Object.assign(ui, { imageName: document.getElementById('imageName'), imageDimensions: document.getElementById('imageDimensions'), imageSize: document.getElementById('imageSize'), notificationMessage: document.getElementById('notificationMessage'), zoomLevel: document.getElementById('zoomLevel')});

    updateHelpUI();
}

export function updateAllUI() {
    updateHelpUI();
    updateObjectListUI();
    updateDetailsPanelUI();
    updateInfoBarUI();
    updateModeIndicatorUI();
}

export function updateClassSelectorUI() {
    if (!state.config) {
        ui.classSelectorWrapper.classList.add('hidden');
        return;
    }
    ui.classSelectorWrapper.classList.remove('hidden');
    ui.classSelector.innerHTML = '';
    const classes = Object.keys(state.config);
    classes.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        ui.classSelector.appendChild(option);
    });
    ui.classSelector.value = state.appState.currentClass;
}

export function updateModeIndicatorUI() {
    const indicator = ui.modeIndicator;
    indicator.classList.remove('bg-yellow-500', 'text-black');
    indicator.style.backgroundColor = '';
    indicator.style.color = '';

    if (state.appState.mode === 'DRAWING_BBOX') {
        indicator.textContent = 'BBOX 그리기 모드';
        indicator.classList.add('bg-yellow-500', 'text-black');
        indicator.classList.remove('hidden');
    } else if (state.appState.mode === 'EDITING_POSE' && state.appState.selectedPointIndex !== -1) {
        indicator.textContent = '랜드마크 그리기 모드';
        indicator.style.backgroundColor = 'var(--md-sys-color-primary)';
        indicator.style.color = 'var(--md-sys-color-on-primary)';
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

export function updateHelpUI() {
    const showHelp = !state.config || state.imageFiles.length === 0;
    ui.configHelp.classList.toggle('hidden', !showHelp);
    ui.objectListWrapper.classList.toggle('hidden', showHelp);
    ui.detailsWrapper.classList.toggle('hidden', showHelp);

    if (!state.config) {
        ui.btnAddObject.disabled = true;
        ui.classSelectorWrapper.classList.add('hidden');
        ui.configHelp.innerHTML = `
            <h3 class="font-bold text-white mb-2">1. Config 파일을 로드하세요.</h3>
            <p>라벨의 이름과 뼈대(skeleton) 구조를 정의하는 JSON 파일입니다.</p>
            <p class="mt-2">예시 포맷:</p>
            <pre class="bg-gray-900 p-2 rounded-md mt-1 text-xs whitespace-pre-wrap"><code>{
  "person": {
    "labels": ["코", "눈", ...],
    "skeleton": [ [0, 1], [0, 2], ... ]
  },
  "vehicle": { ... }
}</code></pre>
        `;
    } else if (state.imageFiles.length === 0) {
        ui.btnAddObject.disabled = true;
        ui.classSelectorWrapper.classList.remove('hidden');
        ui.configHelp.innerHTML = `
            <h3 class="font-bold text-white mb-2">2. 이미지 폴더를 열어주세요.</h3>
            <p>라벨링할 이미지가 포함된 폴더를 선택합니다.</p>
        `;
    } else {
        ui.btnAddObject.disabled = false;
        ui.classSelectorWrapper.classList.remove('hidden');
    }
}

export function updateObjectListUI() {
    ui.objectListWrapper.innerHTML = '';
    const objects = state.annotationData[state.imageFiles[state.currentImageIndex]?.name]?.objects || [];
    if (objects.length === 0) {
        ui.objectListWrapper.innerHTML = `<p class="text-center text-gray-500 p-4">객체가 없습니다. <br>'A' 키를 눌러 추가하세요.</p>`;
        ui.detailsWrapper.classList.add('hidden');
        return;
    }

    objects.forEach((obj, index) => {
        const item = document.createElement('div');
        item.className = 'object-item p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors flex justify-between items-center';
        if (index === state.appState.selectedObjectIndex) item.classList.add('selected');
        item.innerHTML = `
            <div>
                <span class="font-semibold">객체 ${index + 1}</span>
                <span class="text-xs ml-2 px-2 py-1 rounded-full" style="background-color: var(--md-sys-color-surface-container-high);">${obj.className || 'N/A'}</span>
            </div>
        `;
        item.dataset.objectId = index;
        ui.objectListWrapper.appendChild(item);
    });
}

export function updateDetailsPanelUI() {
    if (state.appState.selectedObjectIndex === -1) {
        ui.detailsWrapper.classList.add('hidden');
        return;
    }
    ui.detailsWrapper.classList.remove('hidden');
    const obj = state.annotationData[state.imageFiles[state.currentImageIndex].name].objects[state.appState.selectedObjectIndex];

    ui.detailsWrapper.innerHTML = `
        <div id="details-header" class="flex justify-between items-center p-2">
            <h3 class="text-md font-semibold" id="details-title"></h3>
            <button id="btnDeleteObject" class="btn btn-icon btn-danger" title="선택된 객체 삭제 (Delete)"></button>
        </div>
        <div id="class-info" class="p-2 text-sm space-y-1"></div>
        <div id="bbox-info" class="p-2 text-sm space-y-2"></div>
        <div id="keypoint-list" class="space-y-1 p-1"></div>
    `;

    document.getElementById('details-title').textContent = `객체 ${state.appState.selectedObjectIndex + 1} 상세정보`;
    const deleteButton = document.getElementById('btnDeleteObject');
    deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`;

    updateClassInfoUI(obj);
    updateBboxInfoUI(obj);
    updateKeypointListUI(obj);
}

function updateClassInfoUI(obj) {
    const classInfoEl = document.getElementById('class-info');
    if (!classInfoEl) return;

    classInfoEl.innerHTML = `
        <label for="details-class-selector" class="font-semibold text-gray-300">클래스</label>
        <select id="details-class-selector" class="w-full rounded-md p-2 mt-1" style="background-color: var(--md-sys-color-surface-container-highest);"></select>
    `;

    const selector = document.getElementById('details-class-selector');
    const classes = Object.keys(state.config);
    classes.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        if (className === obj.className) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}


export function updateBboxInfoUI(obj) {
    const bboxInfoEl = document.getElementById('bbox-info');
    if (!bboxInfoEl) return;
    bboxInfoEl.innerHTML = '';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'font-semibold text-gray-300';
    titleDiv.textContent = 'Bounding Box';
    bboxInfoEl.appendChild(titleDiv);

    if (!obj.bbox) {
        const container = document.createElement('div');
        container.className = 'flex items-center justify-between mt-1';
        container.innerHTML = `<p class="text-gray-400 text-xs">BBox 정보 없음</p>`;
        const addButton = document.createElement('button');
        addButton.textContent = '+ BBox 추가';
        addButton.className = 'btn btn-tonal text-xs py-1 px-2';
        addButton.dataset.action = 'add-bbox';
        container.appendChild(addButton);
        bboxInfoEl.appendChild(container);
        return;
    }

    const [x1, y1, x2, y2] = obj.bbox;
    const coordsDiv = document.createElement('div');
    coordsDiv.className = 'grid grid-cols-2 gap-2 text-xs mt-1';
    coordsDiv.innerHTML = `
        <div class="flex items-center">X1: <input type="number" data-coord="0" value="${x1.toFixed(1)}" class="ml-1 w-full rounded px-1 py-0.5 text-white"></div>
        <div class="flex items-center">Y1: <input type="number" data-coord="1" value="${y1.toFixed(1)}" class="ml-1 w-full rounded px-1 py-0.5 text-white"></div>
        <div class="flex items-center">X2: <input type="number" data-coord="2" value="${x2.toFixed(1)}" class="ml-1 w-full rounded px-1 py-0.5 text-white"></div>
        <div class="flex items-center">Y2: <input type="number" data-coord="3" value="${y2.toFixed(1)}" class="ml-1 w-full rounded px-1 py-0.5 text-white"></div>
    `;
    bboxInfoEl.appendChild(coordsDiv);

    coordsDiv.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', e => {
            state.pushHistory(JSON.parse(JSON.stringify(state.annotationData[state.imageFiles[state.currentImageIndex].name].objects)));
            const coordIndex = parseInt(e.target.dataset.coord);
            obj.bbox[coordIndex] = parseFloat(e.target.value);
            redrawCanvas();
        });
    });
}

export function updateKeypointListUI(obj) {
    const keypointListEl = document.getElementById('keypoint-list');
    if (!keypointListEl) return;
    keypointListEl.innerHTML = '';

    if (!obj || !obj.className || !state.config[obj.className]) {
        keypointListEl.innerHTML = '<p class="text-xs text-gray-500 p-2">객체의 클래스가 유효하지 않아 키포인트를 표시할 수 없습니다.</p>';
        return;
    }

    const header = document.createElement('div');
    header.className = 'keypoint-header p-2 text-xs font-bold';
    header.innerHTML = `
        <span class="col-label">라벨</span>
        <span class="col-coords">좌표</span>
        <span class="col-vis">Visibility</span>
    `;
    keypointListEl.appendChild(header);

    const points = obj.keypoints;
    const labels = state.config[obj.className].labels;

    labels.forEach((label, index) => {
        const point = points[index];
        const item = document.createElement('div');
        item.className = 'keypoint-item p-2 text-xs rounded-lg cursor-pointer transition-colors flex items-center';
        if (index === state.appState.selectedPointIndex) item.classList.add('selected');

        const visibilityRadios = [0, 1, 2].map(v => `
            <label class="inline-flex items-center">
                <input type="radio" class="form-radio bg-gray-900 text-blue-500" name="vis-${state.appState.selectedObjectIndex}-${index}" value="${v}" ${point.visible === v ? 'checked' : ''}>
                <span class="ml-1 text-gray-400">${v}</span>
            </label>
        `).join('');

        item.innerHTML = `
            <span class="col-label font-semibold truncate">${index + 1}. ${label}</span>
            <div class="col-coords flex items-center gap-1">
                <span class="text-gray-400">X:</span>
                <input type="number" value="${point.x.toFixed(1)}" class="w-full rounded px-1 py-0.5 text-white">
                <span class="text-gray-400">Y:</span>
                <input type="number" value="${point.y.toFixed(1)}" class="w-full rounded px-1 py-0.5 text-white">
            </div>
            <div class="col-vis flex justify-around items-center">
                ${visibilityRadios}
            </div>
        `;

        item.dataset.keypointId = index;

        const xInput = item.querySelector('input[type="number"][value*="."]');
        const yInput = item.querySelectorAll('input[type="number"]')[1];

        [xInput, yInput].forEach((input, i) => {
            input.addEventListener('change', (e) => {
                state.pushHistory(JSON.parse(JSON.stringify(state.annotationData[state.imageFiles[state.currentImageIndex].name].objects)));
                point[i === 0 ? 'x' : 'y'] = parseFloat(e.target.value);
                redrawCanvas();
            });
        });

        item.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.pushHistory(JSON.parse(JSON.stringify(state.annotationData[state.imageFiles[state.currentImageIndex].name].objects)));
                point.visible = parseInt(e.target.value);
                redrawCanvas();
            });
        });

        keypointListEl.appendChild(item);
    });
}

export function updateInfoBarUI() {
    if (state.currentImageIndex < 0) {
        ui.imageName.textContent = 'N/A';
        ui.imageDimensions.textContent = '';
        ui.imageSize.textContent = '';
        return;
    };
    const file = state.imageFiles[state.currentImageIndex];

    ui.imageName.textContent = file.name;
    ui.imageProgress.textContent = `${state.currentImageIndex + 1} / ${state.imageFiles.length}`;
    ui.zoomLevel.textContent = `Zoom: ${(state.transform.scale * 100).toFixed(0)}%`;

    if (state.currentImage) ui.imageDimensions.textContent = `${state.currentImage.naturalWidth} x ${state.currentImage.naturalHeight}`;
    ui.imageSize.textContent = formatBytes(file.size);
}
