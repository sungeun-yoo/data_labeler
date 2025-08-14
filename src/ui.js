import * as state from './state.js';
import { redrawCanvas } from './canvas.js';
import { formatBytes, showNotification, getColorForClass } from './utils.js';
import * as shortcutManager from './shortcutManager.js';
import { setCustomColor } from './colorManager.js';
import { exportAsLiveJson, exportAsYoloPose, exportAsMfYoloPose } from './dataExporter.js';

export const ui = {};
let tempShortcutConfig = {};

export function initUI() {
    Object.assign(ui, {
        // Top bar
        appIcon: document.getElementById('app-icon'),
        btnLoadConfig: document.getElementById('btnLoadConfig'),
        configLoader: document.getElementById('configLoader'),
        btnLoadImageDir: document.getElementById('btnLoadImageDir'),
        imageDirLoader: document.getElementById('imageDirLoader'),
        labelDirLoader: document.getElementById('labelDirLoader'),
        sapiensDirLoader: document.getElementById('sapiensDirLoader'),
        btnOpenLabelModal: document.getElementById('btnOpenLabelModal'),
        btnSave: document.getElementById('btnSave'),
        btnPrev: document.getElementById('btnPrev'),
        btnNext: document.getElementById('btnNext'),
        imageProgress: document.getElementById('imageProgress'),
        btnShortcutSettings: document.getElementById('btnShortcutSettings'),

        // Canvas
        canvas: document.getElementById('mainCanvas'),
        ctx: document.getElementById('mainCanvas').getContext('2d'),
        canvasWrapper: document.getElementById('split-0'),
        canvasLoader: document.getElementById('canvas-loader'),
        modeIndicator: document.getElementById('mode-indicator'),

        // Right panel
        btnAddObject: document.getElementById('btnAddObject'),
        configHelp: document.getElementById('config-help'),
        objectListWrapper: document.getElementById('object-list-wrapper'),
        detailsWrapper: document.getElementById('details-wrapper'),
        classSelectorWrapper: document.getElementById('class-selector-wrapper'),
        classSelector: document.getElementById('class-selector'),
        classColorIndicator: document.getElementById('class-color-indicator'),

        // Footer
        imageName: document.getElementById('imageName'),
        imageDimensions: document.getElementById('imageDimensions'),
        imageSize: document.getElementById('imageSize'),
        notificationMessage: document.getElementById('notificationMessage'),
        zoomLevel: document.getElementById('zoomLevel'),

        // Modals & Popups
        toastPopup: document.getElementById('toast-popup'),
        shortcutModal: document.getElementById('shortcutModal'),
        iconModal: document.getElementById('icon-modal'),
        iconModalContent: document.getElementById('icon-modal-content'),
        btnModalClose: document.getElementById('btnModalClose'),
        shortcutList: document.getElementById('shortcutList'),
        btnResetShortcuts: document.getElementById('btnResetShortcuts'),
        btnSaveShortcuts: document.getElementById('btnSaveShortcuts'),

        // Left Sidebar
        leftSidebarContainer: document.getElementById('left-sidebar-container'),
        labelSidebar: document.getElementById('label-sidebar'),
        labelSidebarToggle: document.getElementById('label-sidebar-toggle'),
        imageSidebar: document.getElementById('image-list-sidebar'),
        imageSidebarToggle: document.getElementById('image-list-sidebar-toggle'),
        leftSidebarResizer: document.getElementById('left-sidebar-resizer'),

        // Label Viewer panel
        btnLiveJson: document.getElementById('btn-live-json'),
        btnYoloPose: document.getElementById('btn-yolo-pose'),
        btnMfYoloPose: document.getElementById('btn-mf-yolo-pose'),
        liveJsonContent: document.getElementById('live-json-content'),
        yoloPoseContent: document.getElementById('yolo-pose-content'),
        mfYoloPoseContent: document.getElementById('mf-yolo-pose-content'),
        liveJsonOutput: document.getElementById('live-json-output'),
        yoloPoseOutput: document.getElementById('yolo-pose-output'),
        mfYoloPoseOutput: document.getElementById('mf-yolo-pose-output'),
        btnCopyLive: document.getElementById('btn-copy-live'),
        btnDownloadLive: document.getElementById('btn-download-live'),
        btnCopyYolo: document.getElementById('btn-copy-yolo'),
        btnDownloadYolo: document.getElementById('btn-download-yolo'),
        btnCopyMfYolo: document.getElementById('btn-copy-mf-yolo'),
        btnDownloadMfYolo: document.getElementById('btn-download-mf-yolo'),

        // Image List panel
        imageListContentWrapper: document.getElementById('image-list-content-wrapper'),
        viewModeIcon: document.getElementById('view-mode-icon'),
        viewModeList: document.getElementById('view-mode-list'),
        thumbnailSizeSlider: document.getElementById('thumbnail-size-slider'),
    });

    ui.labelSidebarToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>`;
    ui.imageSidebarToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>`;
    ui.viewModeIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>`;
    ui.viewModeList.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>`;

    const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>`;
    const downloadIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>`;

    ui.btnCopyLive.innerHTML = copyIcon;
    ui.btnDownloadLive.innerHTML = downloadIcon;
    ui.btnCopyYolo.innerHTML = copyIcon;
    ui.btnDownloadYolo.innerHTML = downloadIcon;
    ui.btnCopyMfYolo.innerHTML = copyIcon;
    ui.btnDownloadMfYolo.innerHTML = downloadIcon;

    ui.btnPrev.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`;
    ui.btnNext.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>`;
    ui.btnShortcutSettings.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`;
    ui.canvasLoader.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p>이미지 로딩 중...</p>`;
    document.querySelector('footer').innerHTML = `<div class="flex items-center gap-x-4 gap-y-1 flex-wrap"><p id="imageName" class="font-semibold truncate">N/A</p><p id="imageDimensions" style="color: var(--md-sys-color-on-surface-variant);"></p><p id="imageSize" style="color: var(--md-sys-color-on-surface-variant);"></p></div><div class="flex items-center gap-4"><p id="mouseCoords" style="color: var(--md-sys-color-on-surface-variant);"></p><p id="notificationMessage" class="transition-colors duration-300"></p><p id="zoomLevel" style="color: var(--md-sys-color-on-surface-variant);">Zoom: 100%</p></div>`;

    // Re-assign footer elements after innerHTML overwrite
    Object.assign(ui, {
        imageName: document.getElementById('imageName'),
        imageDimensions: document.getElementById('imageDimensions'),
        imageSize: document.getElementById('imageSize'),
        notificationMessage: document.getElementById('notificationMessage'),
        zoomLevel: document.getElementById('zoomLevel'),
        mouseCoords: document.getElementById('mouseCoords')
    });

    ui.btnShortcutSettings.addEventListener('click', () => {
        populateShortcutModal();
        ui.shortcutModal.classList.remove('hidden');
    });
    ui.btnModalClose.addEventListener('click', () => {
        ui.shortcutModal.classList.add('hidden');
    });
    ui.btnSaveShortcuts.addEventListener('click', () => {
        shortcutManager.saveShortcuts(tempShortcutConfig);
        ui.shortcutModal.classList.add('hidden');
        showNotification('단축키 설정이 저장되었습니다.', 'success', ui);
    });
    ui.btnResetShortcuts.addEventListener('click', () => {
        shortcutManager.resetShortcuts();
        populateShortcutModal();
        showNotification('단축키가 기본값으로 초기화되었습니다.', 'info', ui);
    });

    // Set initial state for Label viewer
    switchLabelViewTab('live');
    ui.classColorIndicator.addEventListener('click', () => {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.display = 'none';

        // Set initial value to current color to open picker with it selected
        const currentBgColor = ui.classColorIndicator.style.backgroundColor;
        if (currentBgColor) {
            // Need to convert rgb to hex for the color input
            const rgb = currentBgColor.match(/\d+/g);
            if (rgb) {
                colorInput.value = `#${(+rgb[0]).toString(16).padStart(2, '0')}${(+rgb[1]).toString(16).padStart(2, '0')}${(+rgb[2]).toString(16).padStart(2, '0')}`;
            }
        }

        colorInput.addEventListener('change', (e) => {
            const newColor = e.target.value;
            const className = state.appState.currentClass;
            if (className) {
                setCustomColor(className, newColor);
                updateAllUI(); // Redraw UI to reflect new color
                redrawCanvas(); // Redraw canvas to reflect new color
            }
            document.body.removeChild(colorInput);
        });

        document.body.appendChild(colorInput);
        colorInput.click();
    });

    updateHelpUI();
}

function populateShortcutModal() {
    const shortcuts = shortcutManager.getShortcuts();
    tempShortcutConfig = JSON.parse(JSON.stringify(shortcuts)); // Create a deep copy for editing
    const descriptions = shortcutManager.actionDescriptions;

    ui.shortcutList.innerHTML = '';

    for (const action in descriptions) {
        const desc = descriptions[action];
        const assignedKeys = tempShortcutConfig[action] || [];

        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-2 rounded-lg';

        const label = document.createElement('span');
        label.className = 'text-sm';
        label.textContent = desc;

        const keysWrapper = document.createElement('div');
        keysWrapper.className = 'flex items-center gap-2';

        // For now, we only support editing the first key.
        // A more complex UI would be needed for multi-key assignment.
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.value = assignedKeys[0] || 'N/A';
        keyInput.className = 'shortcut-input w-24 text-center';
        keyInput.readOnly = true;

        keyInput.addEventListener('click', () => {
            keyInput.value = '입력 대기...';
            keyInput.focus();
        });

        keyInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            const newKey = e.key.toLowerCase();

            // TODO: Check for duplicates before assigning

            keyInput.value = newKey;
            tempShortcutConfig[action] = [newKey]; // Replace current keys with the new one
            keyInput.blur();
        });

        keyInput.addEventListener('blur', () => {
            if (keyInput.value === '입력 대기...') {
                keyInput.value = assignedKeys[0] || 'N/A';
            }
        });

        keysWrapper.appendChild(keyInput);
        row.appendChild(label);
        row.appendChild(keysWrapper);
        ui.shortcutList.appendChild(row);
    }
}

export function updateAllUI() {
    updateHelpUI();
    updateObjectListUI();
    updateDetailsPanelUI();
    updateInfoBarUI();
    updateModeIndicatorUI();
    updateClassSelectorUI();
    updateLabelView();
    if (activeSidebar === 'image') {
        updateImageListUI();
    }
}

export function updateClassSelectorUI() {
    if (!state.config) {
        ui.classSelectorWrapper.classList.add('hidden');
        return;
    }
    ui.classSelectorWrapper.classList.remove('hidden');

    const classes = Object.keys(state.config);

    // Only redraw options if they've changed
    if (ui.classSelector.options.length !== classes.length) {
        ui.classSelector.innerHTML = '';
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            ui.classSelector.appendChild(option);
        });
    }

    ui.classSelector.value = state.appState.currentClass;
    ui.classColorIndicator.style.backgroundColor = getColorForClass(state.appState.currentClass, classes);
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
        ui.objectListWrapper.innerHTML = `<p class="text-center text-gray-500 p-4">객체가 없습니다. <br>'+ 객체 추가' 버튼을 눌러 추가하세요.</p>`;
        ui.detailsWrapper.classList.add('hidden');
        return;
    }

    const allClasses = Object.keys(state.config || {});

    const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg>`;
    const eyeSlashIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.242 4.242a2 2 0 012.828 2.828l-2.828-2.828zM10 17a7 7 0 01-7-7c0-1.789.66-3.425 1.76-4.673l1.428 1.428A4.982 4.982 0 008 10a5 5 0 004.899 5.002l1.43 1.428A6.971 6.971 0 0110 17z" clip-rule="evenodd" /></svg>`;
    const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`;


    objects.forEach((obj, index) => {
        const item = document.createElement('div');
        item.className = 'object-item p-2 rounded-lg cursor-pointer transition-colors flex justify-between items-center';
        if (index === state.appState.selectedObjectIndex) item.classList.add('selected');

        const color = getColorForClass(obj.className, allClasses);

        item.innerHTML = `
            <div class="flex items-center gap-3 flex-grow">
                <span class="w-4 h-4 rounded-full flex-shrink-0" style="background-color: ${color};"></span>
                <div class="flex-grow">
                    <span class="font-semibold">객체 ${index + 1}</span>
                    <span class="text-xs ml-2 px-2 py-1 rounded-full" style="background-color: var(--md-sys-color-surface-container-high);">${obj.className || 'N/A'}</span>
                </div>
            </div>
            <div class="flex items-center gap-1 object-item-actions">
                <button class="btn btn-icon" data-action="toggle-visibility" title="객체 숨기기/보이기">
                    ${obj.hidden ? eyeSlashIcon : eyeIcon}
                </button>
                <button class="btn btn-icon btn-danger" data-action="delete-object" title="객체 삭제">
                    ${trashIcon}
                </button>
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
        </div>
        <div id="class-info" class="p-2 text-sm space-y-1"></div>
        <div id="bbox-info" class="p-2 text-sm space-y-2"></div>
        <div id="keypoint-list" class="space-y-1 p-1"></div>
    `;

    document.getElementById('details-title').textContent = `객체 ${state.appState.selectedObjectIndex + 1} 상세정보`;

    updateClassInfoUI(obj);
    updateBboxInfoUI(obj);
    updateKeypointListUI(obj);
}

let activeSidebar = null; // Can be 'label' or 'image'
const imageUrlCache = new Map();

export function clearImageCache() {
    imageUrlCache.forEach(url => URL.revokeObjectURL(url));
    imageUrlCache.clear();
}

export function switchSidebar(sidebarName) {
    const isAlreadyOpen = activeSidebar === sidebarName;

    // Close any open sidebar first
    if (activeSidebar) {
        const currentSidebar = ui[`${activeSidebar}Sidebar`];
        const currentToggle = ui[`${activeSidebar}SidebarToggle`];
        currentSidebar.classList.remove('active');
        currentToggle.classList.remove('active');
        currentSidebar.style.display = 'none';
    }

    // If it was already open, we just wanted to close it.
    if (isAlreadyOpen) {
        activeSidebar = null;
        ui.leftSidebarContainer.classList.remove('toggled');
    } else {
        // Open the new sidebar
        const newSidebar = ui[`${sidebarName}Sidebar`];
        const newToggle = ui[`${sidebarName}SidebarToggle`];
        newSidebar.style.display = 'flex';
        // Timeout to allow display property to apply before transition
        setTimeout(() => {
            newSidebar.classList.add('active');
            newToggle.classList.add('active');
            ui.leftSidebarContainer.classList.add('toggled');
        }, 10);
        activeSidebar = sidebarName;

        if (sidebarName === 'image') {
            updateImageListUI();
        }
    }
}

export function updateImageListUI() {
    const wrapper = ui.imageListContentWrapper;
    const items = wrapper.children;
    const isListView = wrapper.classList.contains('list-view');

    // If DOM items don't match data, or if view mode has changed, rebuild everything
    if (items.length !== state.imageFiles.length ||
        (items.length > 0 && items[0].classList.contains('list-view-item') !== isListView)) {

        wrapper.innerHTML = ''; // Clear previous items
        if (state.imageFiles.length === 0) {
            wrapper.innerHTML = `<p class="text-gray-500 text-center col-span-full">이미지가 없습니다.</p>`;
            return;
        }

        state.imageFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'image-list-item';
            if (isListView) item.classList.add('list-view-item');
            item.dataset.imageIndex = index;

            let imageUrl = imageUrlCache.get(file.name);
            if (!imageUrl) {
                imageUrl = URL.createObjectURL(file);
                imageUrlCache.set(file.name, imageUrl);
            }
            const img = document.createElement('img');
            img.src = imageUrl;
            item.appendChild(img);

            // Create the correct container for info
            const infoContainer = document.createElement('div');
            if (!isListView) {
                // For icon view, we need two containers
                infoContainer.className = 'icon-view-status-container'; // A wrapper for both status and info
            } else {
                infoContainer.className = 'info';
            }
            item.appendChild(infoContainer);
            wrapper.appendChild(item);
        });
    }

    // Now, update the state of the existing (or newly created) items
    Array.from(items).forEach((item, index) => {
        const file = state.imageFiles[index];
        const annotation = state.annotationData[file.name] || { objects: [] };
        const objectCount = annotation.objects.length;
        const isCompleted = objectCount > 0;

        // Update selection
        item.classList.toggle('selected', index === state.currentImageIndex);

        // Update content (only if it needs to be changed)
        let newContent;
        const infoContainer = item.querySelector('.info, .icon-view-status-container');


        if (isListView) {
            const statusIconHTML = isCompleted
                ? `<span class="status-icon completed"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clip-rule="evenodd" /></svg></span>`
                : '<span class="status-icon"></span>';

            newContent = `<span class="filename" title="${file.name}">${index + 1}. ${file.name}</span><span class="status">${statusIconHTML}<span>obj ${objectCount}</span></span>`;
        } else {
             const statusIconHTML = isCompleted
                ? `<span class="status-icon completed"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clip-rule="evenodd" /></svg></span>`
                : '';
            const objCountText = objectCount > 0 ? `<span class="obj-count">obj ${objectCount}</span>` : '';
            const statusHTML = `<div class="icon-view-status">${statusIconHTML}${objCountText}</div>`;
            newContent = `${statusHTML}<div class="info">${file.name}</div>`;
        }

        // Only update innerHTML if it has actually changed to prevent flicker
        if (infoContainer && infoContainer.innerHTML !== newContent) {
            infoContainer.innerHTML = newContent;
        }
    });


    // Scroll to the selected item if it's not already visible
    const selectedItem = wrapper.querySelector('.selected');
    if (selectedItem) {
        const wrapperRect = wrapper.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();
        if (itemRect.top < wrapperRect.top || itemRect.bottom > wrapperRect.bottom) {
            selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
}


export function switchLabelViewTab(tab) {
    // Hide all content panels by setting display to 'none'
    ui.liveJsonContent.style.display = 'none';
    ui.yoloPoseContent.style.display = 'none';
    ui.mfYoloPoseContent.style.display = 'none';

    // Deactivate all tab buttons
    ui.btnLiveJson.classList.remove('active');
    ui.btnYoloPose.classList.remove('active');
    ui.btnMfYoloPose.classList.remove('active');

    // Show the selected tab by setting display to 'flex' and activate the button
    if (tab === 'live') {
        ui.liveJsonContent.style.display = 'flex';
        ui.btnLiveJson.classList.add('active');
    } else if (tab === 'yolo') {
        ui.yoloPoseContent.style.display = 'flex';
        ui.btnYoloPose.classList.add('active');
    } else if (tab === 'mf_yolo') {
        ui.mfYoloPoseContent.style.display = 'flex';
        ui.btnMfYoloPose.classList.add('active');
    }
}

export function updateLabelView() {
    if (state.currentImageIndex < 0) {
        ui.liveJsonOutput.textContent = '{}';
        ui.yoloPoseOutput.textContent = '';
        ui.mfYoloPoseOutput.textContent = '';
        return;
    }

    ui.liveJsonOutput.textContent = exportAsLiveJson();
    ui.yoloPoseOutput.textContent = exportAsYoloPose();
    ui.mfYoloPoseOutput.textContent = exportAsMfYoloPose();
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
        <span class="col-vis">
            Visibility
            <div class="tooltip-container">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div class="tooltip">
                    <p><b>0:</b> 없음 (이미지 영역 밖에 있거나 없음)</p>
                    <p><b>1:</b> 가려짐 (다른 물체에 의해 가려졌지만 위치 추정 가능)</p>
                    <p><b>2:</b> 보임 (이미지 영역 안에서 명확하게 보임)</p>
                </div>
            </div>
        </span>
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
        ui.mouseCoords.textContent = '';
        return;
    };
    const file = state.imageFiles[state.currentImageIndex];

    ui.imageName.textContent = file.name;
    ui.imageProgress.textContent = `${state.currentImageIndex + 1} / ${state.imageFiles.length}`;
    ui.zoomLevel.textContent = `Zoom: ${(state.transform.scale * 100).toFixed(0)}%`;

    if (state.currentImage) ui.imageDimensions.textContent = `${state.currentImage.naturalWidth} x ${state.currentImage.naturalHeight}`;
    ui.imageSize.textContent = formatBytes(file.size);

    if (state.appState.lastMouseWorldPos) {
        ui.mouseCoords.textContent = `X: ${state.appState.lastMouseWorldPos.x.toFixed(1)}, Y: ${state.appState.lastMouseWorldPos.y.toFixed(1)}`;
    } else {
        ui.mouseCoords.textContent = '';
    }
}
