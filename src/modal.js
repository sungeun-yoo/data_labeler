import { performDeleteObject } from "./events.js";
import { ui } from "./ui.js";
import { proceedWithZipCreation } from "./file.js";

export function showSaveOptionsModal(emptyFileCount) {
    const modal = document.createElement('div');
    modal.id = 'saveOptionsModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="p-6 rounded-2xl shadow-xl w-full max-w-md" style="background-color: var(--md-sys-color-surface-container-high);">
            <h3 class="text-lg font-bold mb-2">저장 옵션</h3>
            <p class="text-sm mb-4" style="color: var(--md-sys-color-on-surface-variant);">
                객체가 없는 라벨 파일이 ${emptyFileCount}개 있습니다. 이 파일들을 어떻게 처리할까요?
            </p>
            <div class="space-y-4 mb-6">
                <div>
                    <p class="text-sm font-medium mb-2">빈 라벨 파일 처리</p>
                    <div class="space-y-2">
                        <label class="flex items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                            <input type="radio" name="empty-file-option" value="include" class="form-radio" checked>
                            <span class="ml-3 text-sm">객체가 없는 라벨도 저장</span>
                        </label>
                        <label class="flex items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                            <input type="radio" name="empty-file-option" value="exclude" class="form-radio">
                            <span class="ml-3 text-sm">객체가 없는 라벨은 파일 생성 안 함</span>
                        </label>
                    </div>
                </div>
                <div class="border-t border-gray-700 my-4"></div>
                <div>
                    <p class="text-sm font-medium mb-2">텍스트 포맷 선택</p>
                    <div class="space-y-2">
                        <label class="flex items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                            <input type="radio" name="text-format-option" value="mf_yolo" class="form-radio" checked>
                            <span class="ml-3 text-sm">MF_YOLO</span>
                        </label>
                        <label class="flex items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                            <input type="radio" name="text-format-option" value="yolo" class="form-radio">
                            <span class="ml-3 text-sm">YOLO</span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="flex justify-end gap-4">
                <button id="btnSaveOptionsCancel" class="btn btn-tonal">취소</button>
                <button id="btnSaveOptionsConfirm" class="btn btn-filled">확인</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const confirmButton = document.getElementById('btnSaveOptionsConfirm');
    confirmButton.addEventListener('click', () => {
        const includeEmpty = document.querySelector('input[name="empty-file-option"]:checked').value === 'include';
        const textFormat = document.querySelector('input[name="text-format-option"]:checked').value;

        const options = {
            includeEmpty: includeEmpty,
            textFormat: textFormat
        };
        proceedWithZipCreation(options);
        hideSaveOptionsModal();
    });

    document.getElementById('btnSaveOptionsCancel').addEventListener('click', hideSaveOptionsModal);
    confirmButton.focus();
}

export function hideSaveOptionsModal() {
    const modal = document.getElementById('saveOptionsModal');
    if (modal) modal.remove();
}

export function showLabelFormatModal() {
    const modal = document.createElement('div');
    modal.id = 'labelFormatModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="p-6 rounded-2xl shadow-xl" style="background-color: var(--md-sys-color-surface-container-high);">
            <h3 class="text-lg font-bold mb-4">라벨 형식 선택</h3>
            <p class="text-sm mb-6" style="color: var(--md-sys-color-on-surface-variant);">어떤 형식의 라벨을 로드하시겠습니까?</p>
            <div class="flex justify-center gap-4">
                <button id="btnChooseExisting" class="btn btn-tonal w-40">기존 라벨</button>
                <button id="btnChooseSapiens" class="btn btn-tonal w-40">Sapiens 라벨</button>
            </div>
             <button id="btnLabelModalClose" class="btn btn-icon absolute top-4 right-4">&times;</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btnChooseExisting').addEventListener('click', () => {
        hideLabelFormatModal();
        ui.labelDirLoader.click();
    });

    document.getElementById('btnChooseSapiens').addEventListener('click', () => {
        hideLabelFormatModal();
        ui.sapiensDirLoader.click();
    });

    document.getElementById('btnLabelModalClose').addEventListener('click', hideLabelFormatModal);
}

export function hideLabelFormatModal() {
    const modal = document.getElementById('labelFormatModal');
    if (modal) modal.remove();
}

export function showSapiensResultModal(matchedCount, unmatchedCount) {
    const modal = document.createElement('div');
    modal.id = 'sapiensResultModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="p-6 rounded-2xl shadow-xl" style="background-color: var(--md-sys-color-surface-container-high);">
            <h3 class="text-lg font-bold mb-2">Sapiens 라벨 로드 결과</h3>
            <p class="text-sm mb-2" style="color: var(--md-sys-color-on-surface-variant);">
                <strong>매칭된 이미지:</strong> ${matchedCount}개
            </p>
            <p class="text-sm mb-6" style="color: var(--md-sys-color-on-surface-variant);">
                <strong>매칭되지 않은 이미지:</strong> ${unmatchedCount}개
            </p>
            <div class="flex justify-end gap-4">
                <button id="btnSapiensModalOk" class="btn btn-filled">확인</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const okButton = document.getElementById('btnSapiensModalOk');
    okButton.addEventListener('click', hideSapiensResultModal);
    okButton.focus();
}

export function hideSapiensResultModal() {
    const modal = document.getElementById('sapiensResultModal');
    if (modal) modal.remove();
}

export function showDeleteConfirmModal() {
    const modal = document.createElement('div');
    modal.id = 'deleteConfirmModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="p-6 rounded-2xl shadow-xl" style="background-color: var(--md-sys-color-surface-container-high);">
            <h3 class="text-lg font-bold mb-2">객체 삭제</h3>
            <p class="text-sm mb-6" style="color: var(--md-sys-color-on-surface-variant);">이 객체를 정말 삭제하시겠습니까?</p>
            <div class="flex justify-end gap-4">
                <button id="btnModalCancel" class="btn btn-tonal">취소</button>
                <button id="btnModalConfirm" class="btn btn-danger">삭제</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const confirmButton = document.getElementById('btnModalConfirm');
    confirmButton.addEventListener('click', () => {
        performDeleteObject();
        hideDeleteConfirmModal();
    });
    document.getElementById('btnModalCancel').addEventListener('click', hideDeleteConfirmModal);

    confirmButton.focus();
}

export function hideDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.remove();
}

export function isModalOpen() {
    return !!document.getElementById('deleteConfirmModal') ||
           !!document.getElementById('sapiensResultModal') ||
           !!document.getElementById('labelFormatModal') ||
           !!document.getElementById('saveOptionsModal');
}
