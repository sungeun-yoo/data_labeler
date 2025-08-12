import { performDeleteObject } from "./events.js";
import { ui } from "./ui.js";

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
           !!document.getElementById('labelFormatModal');
}
