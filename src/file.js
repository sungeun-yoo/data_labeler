import * as state from './state.js';
import { ui, updateAllUI, updateHelpUI, updateClassSelectorUI, clearImageCache } from './ui.js';
import { showNotification } from './utils.js';
import { handleResize } from './canvas.js';
import { exportDataAsYoloDetection } from './dataExporter.js';

function validateAndSetConfig(config, filename = 'default_config') {
    if (!Array.isArray(config)) {
        throw new Error("Config는 클래스 이름 배열이어야 합니다. 예: [\"person\", \"car\"]");
    }
    if (config.length === 0) {
        throw new Error("Config에 정의된 클래스가 없습니다.");
    }
    if (!config.every(c => typeof c === 'string' && c.length > 0)) {
        throw new Error("Config의 모든 항목은 비어있지 않은 문자열이어야 합니다.");
    }

    state.setConfig(config);
    state.appState.currentClass = config[0];
    showNotification(`${filename} 로드 완료`, 'success', ui);
    ui.btnLoadImageDir.disabled = false;
    ui.btnOpenLabelModal.disabled = false;
    ui.btnLoadConfig.classList.replace('btn-tonal', 'btn-success');
    ui.btnLoadConfig.textContent = 'Config 로드됨';
    updateClassSelectorUI();
}

export async function handleConfigFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const fileContent = await file.text();
        const parsedConfig = JSON.parse(fileContent);
        validateAndSetConfig(parsedConfig, file.name);
    } catch (error) {
        state.setConfig(null);
        ui.btnLoadImageDir.disabled = true;
        ui.btnOpenLabelModal.disabled = true;
        ui.btnLoadConfig.classList.replace('btn-success', 'btn-tonal');
        ui.btnLoadConfig.textContent = 'Config 열기';

        let errorMessage = `설정 파일 오류: ${error.message}`;
        if (error instanceof SyntaxError) errorMessage = "설정 파일 오류: JSON 형식이 올바르지 않습니다.";
        showNotification(errorMessage, 'error', ui);
    } finally {
        updateHelpUI();
        e.target.value = '';
    }
}

export async function handleImageDirectorySelection(e) {
    showNotification('이미지 폴더를 읽는 중...', 'info', ui);
    ui.canvasLoader.style.display = 'flex';
    try {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(f => /\.(png|jpe?g)$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name));

        if (imageFiles.length === 0) {
            throw new Error('폴더에 지원하는 이미지 파일이 없습니다.');
        }

        clearImageCache();
        state.setImageFiles(imageFiles);
        state.setAnnotationData({});

        imageFiles.forEach(file => {
            state.updateAnnotationData(file.name, { image_path: file.name, objects: [] });
        });

        showNotification('이미지 크기 정보 로딩 중...', 'info', ui);

        let count = 0;
        const total = imageFiles.length;
        for (const file of imageFiles) {
            await getImageDimensions(file);
            count++;
            showNotification(`이미지 로딩: ${count}/${total}`, 'info', ui);
        }

        ui.btnSave.disabled = false;
        ui.btnPrev.disabled = false;
        ui.btnNext.disabled = false;
        ui.btnAddObject.disabled = false;

        ui.btnLoadImageDir.textContent = '폴더 로드됨';
        ui.btnLoadImageDir.classList.replace('btn-tonal', 'btn-success');

        await navigateImage(0, true);
        state.markClean();
        showNotification(`${state.imageFiles.length}개 이미지 로드 완료`, 'success', ui);

    } catch (error) {
        showNotification(error.message, 'error', ui);
        state.setImageFiles([]);
        state.setAnnotationData({});
        ui.btnLoadImageDir.textContent = '이미지 폴더 열기';
        ui.btnLoadImageDir.classList.replace('btn-success', 'btn-tonal');
    } finally {
        updateHelpUI();
        ui.canvasLoader.style.display = 'none';
        e.target.value = '';
    }
}

export async function handleLabelDirectorySelection(e) {
    if (state.imageFiles.length === 0) {
        showNotification('먼저 이미지 폴더를 로드해주세요.', 'error', ui);
        return;
    }

    showNotification('라벨 폴더를 읽는 중...', 'info', ui);
    try {
        const files = Array.from(e.target.files);
        const allJsonFiles = files.filter(f => /\.json$/i.test(f.name));

        // annotations/json/ 서브폴더 구조 감지 (저장된 ZIP을 풀었을 때)
        const jsonSubfolderFiles = allJsonFiles.filter(f => /\/json\//i.test(f.webkitRelativePath));
        const jsonFiles = jsonSubfolderFiles.length > 0 ? jsonSubfolderFiles : allJsonFiles;

        const jsonFileMap = new Map(jsonFiles.map(f => [f.name.replace(/\.json$/i, ''), f]));

        let loadedJsonCount = 0;
        let notFoundCount = 0;
        for (const imageFile of state.imageFiles) {
            const imageName = imageFile.name.replace(/\.[^/.]+$/, "");
            const jsonFile = jsonFileMap.get(imageName);
            const imageFilename = imageFile.name;

            if (jsonFile) {
                try {
                    const data = JSON.parse(await jsonFile.text());
                    // Strip keypoints if present (legacy format compatibility)
                    if (data.objects) {
                        data.objects = data.objects.map(obj => {
                            const { keypoints, ...rest } = obj;
                            return rest;
                        });
                    }
                    // 기존 image_width/height(이미지 로드 시점에 채워진 값)를 보존하며 머지
                    const existing = state.annotationData[imageFilename] || {};
                    state.updateAnnotationData(imageFilename, {
                        ...existing,
                        ...data,
                        image_width: data.image_width || existing.image_width,
                        image_height: data.image_height || existing.image_height,
                    });
                    loadedJsonCount++;
                } catch (err) {
                    showNotification(`${jsonFile.name} 파싱 오류.`, 'error', ui);
                }
            } else {
                notFoundCount++;
            }
        }

        if (loadedJsonCount > 0) {
            showNotification(`${loadedJsonCount}개의 라벨 파일 로드 완료.`, 'success', ui);
            ui.btnOpenLabelModal.textContent = '라벨 로드됨';
            ui.btnOpenLabelModal.classList.replace('btn-tonal', 'btn-success');
        }
        if (notFoundCount > 0) {
            showNotification(`이미지와 일치하는 ${notFoundCount}개의 라벨 파일을 찾을 수 없습니다.`, 'warning', ui);
        }
        if (loadedJsonCount === 0 && notFoundCount > 0) {
            showNotification('일치하는 라벨 파일을 찾을 수 없습니다.', 'error', ui);
        }

        await navigateImage(0);
        state.markClean();

    } catch (error) {
        showNotification(`라벨 로딩 오류: ${error.message}`, 'error', ui);
    } finally {
        e.target.value = '';
    }
}

function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (state.annotationData[file.name]) {
                state.annotationData[file.name].image_width = img.naturalWidth;
                state.annotationData[file.name].image_height = img.naturalHeight;
            }
            URL.revokeObjectURL(img.src);
            resolve();
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error(`이미지 파일의 크기를 읽는 데 실패했습니다: ${file.name}`));
        };
        img.src = URL.createObjectURL(file);
    });
}

let isNavigating = false;
export async function navigateImage(direction, isInitialLoad = false) {
    if (isNavigating) return;
    const newIndex = isInitialLoad ? 0 : state.currentImageIndex + direction;
    if (newIndex < 0 || newIndex >= state.imageFiles.length) return;

    isNavigating = true;
    ui.canvasLoader.style.display = 'flex';
    try {
        state.setCurrentImageIndex(newIndex);
        state.resetAppState();
        await loadAndDrawImage(newIndex);
    } catch (error) {
        showNotification(error.message, 'error', ui);
    } finally {
        ui.canvasLoader.style.display = 'none';
        isNavigating = false;
    }
}

function loadAndDrawImage(index) {
    return new Promise((resolve, reject) => {
        const file = state.imageFiles[index];
        if (!file) return reject(new Error(`Image file at index ${index} not found.`));

        const img = new Image();
        img.onload = async () => {
            try {
                state.setCurrentImage(img);
                // 라벨 로드 등으로 사이즈 메타가 비어있을 경우 보정
                const existing = state.annotationData[file.name];
                if (existing && (!existing.image_width || !existing.image_height)) {
                    existing.image_width = img.naturalWidth;
                    existing.image_height = img.naturalHeight;
                }
                await loadAnnotationForImage(index);
                handleResize();
                updateAllUI();
                resolve();
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => reject(new Error(`이미지 로드 실패: ${file.name}`));
        img.src = URL.createObjectURL(file);
    });
}

async function loadAnnotationForImage(index) {
    const imageFilename = state.imageFiles[index].name;
    state.resetHistory();

    if (!state.annotationData[imageFilename]) {
        state.updateAnnotationData(imageFilename, { image_path: imageFilename, objects: [] });
    }

    const currentObjects = state.annotationData[imageFilename].objects;
    state.pushHistory(JSON.parse(JSON.stringify(currentObjects)));
}

export async function saveAllAnnotationsToZip() {
    if (Object.keys(state.annotationData).length === 0) {
        showNotification('저장할 데이터가 없습니다.', 'info', ui);
        return;
    }

    showNotification('ZIP 파일 생성 중...', 'info', ui);

    try {
        const zip = new JSZip();

        for (const filename in state.annotationData) {
            if (Object.prototype.hasOwnProperty.call(state.annotationData, filename)) {
                // 메모리 데이터를 변형하지 않도록 deep clone 후 직렬화
                const output = JSON.parse(JSON.stringify(state.annotationData[filename]));

                // BBox 좌표 정규화 (top-left, bottom-right 순서)
                if (Array.isArray(output.objects)) {
                    output.objects.forEach(obj => {
                        if (obj.bbox) {
                            const [x1, y1, x2, y2] = obj.bbox;
                            obj.bbox = [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
                        }
                    });
                }

                const baseFilename = filename.replace(/\.[^/.]+$/, "");

                // JSON (항상 저장)
                zip.file(`json/${baseFilename}.json`, JSON.stringify(output, null, 2));

                // YOLO detection TXT (라벨 있는 경우만)
                const yoloString = exportDataAsYoloDetection(output);
                if (yoloString) {
                    zip.file(`labels/${baseFilename}.txt`, yoloString);
                }
            }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(zipBlob),
            download: `annotations_${new Date().toISOString().slice(0, 10)}.zip`
        });
        a.click();
        URL.revokeObjectURL(a.href);

        state.markClean();
        showNotification('모든 파일이 ZIP으로 저장되었습니다.', 'success', ui);
    } catch (error) {
        showNotification(`ZIP 생성 오류: ${error.message}`, 'error', ui);
        console.error("Failed to create ZIP file:", error);
    }
}
