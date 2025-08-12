import * as state from './state.js';
import { ui, updateAllUI, updateHelpUI, updateClassSelectorUI, clearImageCache } from './ui.js';
import { showNotification } from './utils.js';
import { handleResize, redrawCanvas, centerImage } from './canvas.js';
import { exportDataAsYoloPose } from './dataExporter.js';
import { showSapiensResultModal } from './modal.js';

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

        clearImageCache(); // Clear old image URLs before setting new files
        state.setImageFiles(imageFiles);
        state.setAnnotationData({}); // 기존 데이터 초기화

        for (const imageFile of imageFiles) {
            const imageFilename = imageFile.name;
            state.updateAnnotationData(imageFilename, { image_path: imageFilename, objects: [] });
        }

        ui.btnSave.disabled = false;
        ui.btnPrev.disabled = false;
        ui.btnNext.disabled = false;
        ui.btnAddObject.disabled = false;

        ui.btnLoadImageDir.textContent = '폴더 로드됨';
        ui.btnLoadImageDir.classList.replace('btn-tonal', 'btn-success');

        await navigateImage(0, true);
        showNotification(`${state.imageFiles.length}개 이미지 로드됨`, 'success', ui);

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
        const jsonFiles = files.filter(f => /\.json$/i.test(f.name));
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
                    state.updateAnnotationData(imageFilename, data);
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

        // Refresh the current image's annotation
        await navigateImage(0);

    } catch (error) {
        showNotification(`라벨 로딩 오류: ${error.message}`, 'error', ui);
    } finally {
        e.target.value = '';
    }
}

export async function handleSapiensDirectorySelection(e) {
    if (state.imageFiles.length === 0) {
        showNotification('먼저 이미지 폴더를 로드해주세요.', 'error', ui);
        return;
    }
    if (!state.config.person) {
        showNotification('Sapiens 포맷을 처리하려면 "person" 클래스 설정이 필요합니다.', 'error', ui);
        return;
    }

    showNotification('Sapiens 라벨 폴더를 읽는 중...', 'info', ui);
    try {
        const files = Array.from(e.target.files);
        const jsonFiles = files.filter(f => /\.json$/i.test(f.name));

        if (jsonFiles.length === 0) {
            throw new Error('폴더에 JSON 파일이 없습니다.');
        }

        // Sapiens 포맷은 파일 이름 매칭이 아니라, 폴더 내 모든 json을 합치는 방식일 수 있음.
        // 여기서는 첫번째 json 파일 하나만 처리하는 것으로 가정.
        // 만약 여러 파일이라면, 이미지 파일 이름과 매칭되는 로직 필요.
        // 우선은 하나의 파일에 모든 이미지 데이터가 있다고 가정.
        const sapiensFile = jsonFiles[0];

        const fileContent = await sapiensFile.text();
        const data = JSON.parse(fileContent);

        if (!data.instance_info || !data.meta_info) {
            throw new Error('Sapiens 포맷이 아닙니다. "instance_info" 또는 "meta_info" 속성이 없습니다.');
        }

        const keypointName2Id = data.meta_info.keypoint_name2id;
        const configLabels = state.config.person.labels;

        let loadedCount = 0;
        let unmatchedCount = 0;
        // instance_info is an array of objects, but the user sample suggests it corresponds to annotations for one or more images.
        // The sample doesn't specify how to map instances to image files.
        // A common pattern is one JSON per image, or a single JSON with a field mapping to the image name.
        // Let's assume for now one JSON file per image, named identically.

        const jsonFileMap = new Map(jsonFiles.map(f => [f.name.replace(/\.json$/i, ''), f]));

        for (const imageFile of state.imageFiles) {
            const imageNameWithoutExt = imageFile.name.replace(/\.[^/.]+$/, "");
            const jsonFile = jsonFileMap.get(imageNameWithoutExt);

            if(jsonFile) {
                const sapiensData = JSON.parse(await jsonFile.text());
                const objects = sapiensData.instance_info.map(instance => {
                    const keypoints = configLabels.map(labelName => {
                        const sapiensIndex = keypointName2Id[labelName];
                        if (sapiensIndex !== undefined && instance.keypoints[sapiensIndex]) {
                            const [x, y] = instance.keypoints[sapiensIndex];
                            const score = instance.keypoint_scores[sapiensIndex];
                            const visible = score > 0.5 ? 2 : 0;
                            return { x, y, visible };
                        }
                        return { x: 0, y: 0, visible: 0 };
                    });

                    const bbox = instance.bbox && instance.bbox.length > 0 ? instance.bbox[0] : [0,0,0,0];

                    return {
                        className: 'person',
                        bbox: bbox,
                        keypoints: keypoints,
                        hidden: false,
                    };
                });

                state.updateAnnotationData(imageFile.name, {
                    image_path: imageFile.name,
                    image_width: state.annotationData[imageFile.name]?.image_width,
                    image_height: state.annotationData[imageFile.name]?.image_height,
                    objects: objects,
                });
                loadedCount++;
            } else {
                unmatchedCount++;
            }
        }

        showSapiensResultModal(loadedCount, unmatchedCount);

        if (loadedCount > 0) {
            ui.btnOpenLabelModal.textContent = '라벨 로드됨';
            ui.btnOpenLabelModal.classList.replace('btn-tonal', 'btn-success');
        }

        // Refresh the current image's annotation
        await navigateImage(0);

    } catch (error) {
        showNotification(`Sapiens 라벨 로딩 오류: ${error.message}`, 'error', ui);
        console.error(error);
    } finally {
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

                // Save image dimensions to the annotation data
                const imageFilename = state.imageFiles[index].name;
                if (state.annotationData[imageFilename]) {
                    state.annotationData[imageFilename].image_width = img.naturalWidth;
                    state.annotationData[imageFilename].image_height = img.naturalHeight;
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

    // 데이터는 이미 handleDirectorySelection에서 로드되었으므로, 해당 데이터를 사용하기만 하면 됩니다.
    // 히스토리를 리셋하고 현재 상태를 첫 히스토리로 추가합니다.
    state.resetHistory();

    if (!state.annotationData[imageFilename]) {
        // 만약의 경우 데이터가 없는 경우를 대비해 기본 구조를 생성합니다.
        state.updateAnnotationData(imageFilename, { image_path: imageFilename, objects: [] });
    }

    // 현재 객체 상태를 히스토리에 추가합니다.
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
                const output = state.annotationData[filename];

                // BBox 좌표 정규화
                output.objects.forEach(obj => {
                    if (obj.bbox) {
                        const [x1, y1, x2, y2] = obj.bbox;
                        obj.bbox = [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
                    }
                });

                const jsonString = JSON.stringify(output, null, 2);
                const baseFilename = filename.replace(/\.[^/.]+$/, "");

                // Add JSON file
                zip.file(`${baseFilename}.json`, jsonString);

                // Add YOLO TXT file
                const yoloString = exportDataAsYoloPose(output);
                if (yoloString) {
                    zip.file(`${baseFilename}.txt`, yoloString);
                }
            }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(zipBlob),
            download: `annotations_${new Date().toISOString().slice(0,10)}.zip`
        });
        a.click();
        URL.revokeObjectURL(a.href);

        showNotification('모든 JSON 파일이 ZIP으로 저장되었습니다.', 'success', ui);
    } catch (error) {
        showNotification(`ZIP 생성 오류: ${error.message}`, 'error', ui);
        console.error("Failed to create ZIP file:", error);
    }
}
