import * as state from './state.js';
import { ui, updateAllUI, updateHelpUI, updateClassSelectorUI } from './ui.js';
import { showNotification } from './utils.js';
import { handleResize, redrawCanvas, centerImage } from './canvas.js';

function validateAndSetConfig(config, filename = 'default_config') {
    if (typeof config !== 'object' || config === null) {
        throw new Error("Config는 객체여야 합니다.");
    }

    const classes = Object.keys(config);
    if (classes.length === 0) {
        throw new Error("Config에 정의된 클래스가 없습니다.");
    }

    for (const className of classes) {
        const classConfig = config[className];
        if (!Array.isArray(classConfig.labels)) throw new Error(`'${className}' 클래스에 'labels' 배열이 없습니다.`);
        if (!Array.isArray(classConfig.skeleton)) throw new Error(`'${className}' 클래스에 'skeleton' 배열이 없습니다.`);
    }

    state.setConfig(config);
    state.appState.currentClass = classes[0];
    showNotification(`${filename} 로드 완료`, 'success', ui);
    ui.btnLoadDir.disabled = false;
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
        ui.btnLoadDir.disabled = true;
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

export async function handleDirectorySelection(e) {
    showNotification('이미지 폴더를 읽는 중...', 'info', ui);
    ui.canvasLoader.style.display = 'flex';
    try {
        const files = Array.from(e.target.files);
        state.setImageFiles(files.filter(f => /\.(png|jpe?g)$/i.test(f.name)).sort((a,b) => a.name.localeCompare(b.name)));
        state.setJsonFiles(files.filter(f => /\.json$/i.test(f.name)));

        if (state.imageFiles.length === 0) throw new Error('폴더에 지원하는 이미지 파일이 없습니다.');

        ui.btnSave.disabled = false;
        ui.btnPrev.disabled = false;
        ui.btnNext.disabled = false;
        ui.btnAddObject.disabled = false;

        ui.btnLoadDir.textContent = '폴더 로드됨';
        ui.btnLoadDir.classList.replace('btn-tonal', 'btn-success');

        await navigateImage(0, true);
        showNotification(`${state.imageFiles.length}개 이미지, ${state.jsonFiles.length}개 JSON 로드됨`, 'success', ui);

    } catch (error) {
        showNotification(error.message, 'error', ui);
        state.setImageFiles([]);
        state.setJsonFiles([]);
        ui.btnLoadDir.textContent = '이미지 폴더 열기';
        ui.btnLoadDir.classList.replace('btn-success', 'btn-tonal');
    } finally {
        updateHelpUI();
        ui.canvasLoader.style.display = 'none';
        e.target.value = '';
    }
}

export async function navigateImage(direction, isInitialLoad = false) {
    const newIndex = isInitialLoad ? 0 : state.currentImageIndex + direction;
    if (newIndex < 0 || newIndex >= state.imageFiles.length) return;

    ui.canvasLoader.style.display = 'flex';
    try {
        const doNavigation = async () => {
            state.setCurrentImageIndex(newIndex);
            state.resetAppState();
            await loadAndDrawImage(newIndex);
        };

        if (state.hasChanges() && !isInitialLoad) await doNavigation();
        else await doNavigation();
    } catch (error) {
        showNotification(error.message, 'error', ui);
    } finally {
        ui.canvasLoader.style.display = 'none';
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
    const jsonFilename = imageFilename.replace(/\.[^/.]+$/, "") + ".json";
    const annotationFile = state.jsonFiles.find(f => f.name === jsonFilename);

    state.resetHistory();

    if (annotationFile) {
        try {
            const data = JSON.parse(await annotationFile.text());
            if (data.objects) {
                state.updateAnnotationData(imageFilename, data);
            } else if (data.keypoints) {
                state.updateAnnotationData(imageFilename, {
                    image_path: data.image_path,
                    objects: [{ id: `obj_${Date.now()}`, bbox: null, keypoints: data.keypoints }]
                });
                showNotification('이전 버전 JSON을 변환했습니다. BBox를 다시 지정해주세요.', 'info', ui);
            }
        } catch (e) {
            showNotification(`${jsonFilename} 파싱 오류. 새로 시작합니다.`, 'error', ui);
            state.updateAnnotationData(imageFilename, { image_path: imageFilename, objects: [] });
        }
    } else {
        state.updateAnnotationData(imageFilename, { image_path: imageFilename, objects: [] });
    }
    state.pushHistory(JSON.parse(JSON.stringify(state.annotationData[imageFilename].objects)));
}

export function saveCurrentAnnotation() {
    if (state.currentImageIndex < 0) return;
    const filename = state.imageFiles[state.currentImageIndex].name;
    const output = state.annotationData[filename];

    output.objects.forEach(obj => {
        if (obj.bbox) {
            const [x1, y1, x2, y2] = obj.bbox;
            obj.bbox = [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
        }
    });

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: filename.replace(/\.[^/.]+$/, "") + ".json"
    });
    a.click();
    URL.revokeObjectURL(a.href);
    state.resetHistory();
    state.pushHistory(JSON.parse(JSON.stringify(output.objects)));
    showNotification(`${a.download} 저장 완료`, 'success', ui);
}
