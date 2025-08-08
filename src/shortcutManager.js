import { shortcuts as defaultShortcuts, numberShortcuts as defaultNumberShortcuts } from './shortcuts.js';

const STORAGE_KEY = 'customShortcuts';

// A more descriptive mapping for UI and internal logic
const combinedDefaults = {};
const reverseDefaults = {};

// Process standard shortcuts
for (const key in defaultShortcuts) {
    const action = defaultShortcuts[key];
    if (!reverseDefaults[action]) reverseDefaults[action] = [];
    reverseDefaults[action].push(key);
    combinedDefaults[action] = reverseDefaults[action];
}

// Process number shortcuts
for (const key in defaultNumberShortcuts) {
    const action = `SELECT_CLASS_${defaultNumberShortcuts[key]}`;
    if (!reverseDefaults[action]) reverseDefaults[action] = [];
    reverseDefaults[action].push(key);
    combinedDefaults[action] = reverseDefaults[action];
}


let activeShortcuts = JSON.parse(JSON.stringify(combinedDefaults));

export function loadShortcuts() {
    try {
        const customShortcutsJSON = localStorage.getItem(STORAGE_KEY);
        if (customShortcutsJSON) {
            const custom = JSON.parse(customShortcutsJSON);
            // Merge saved settings over defaults to ensure new shortcuts are not lost
            activeShortcuts = Object.assign({}, combinedDefaults, custom);
        } else {
            activeShortcuts = JSON.parse(JSON.stringify(combinedDefaults));
        }
    } catch (e) {
        console.error("Error loading custom shortcuts, using defaults.", e);
        activeShortcuts = JSON.parse(JSON.stringify(combinedDefaults));
    }
    // After loading, we need to regenerate the key->action map for the event handler
    regenerateKeyMap();
}

let keyToActionMap = {};
function regenerateKeyMap() {
    keyToActionMap = {};
    for (const action in activeShortcuts) {
        const keys = activeShortcuts[action];
        if (Array.isArray(keys)) {
            keys.forEach(key => keyToActionMap[key] = action);
        } else { // Should not happen with the new structure, but for safety
            keyToActionMap[keys] = action;
        }
    }
}

export function getShortcuts() {
    return activeShortcuts;
}

export function getKeyToActionMap() {
    return keyToActionMap;
}

export function saveShortcuts(newShortcutConfig) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newShortcutConfig));
        activeShortcuts = Object.assign({}, combinedDefaults, newShortcutConfig);
        regenerateKeyMap();
    } catch (e) {
        console.error("Error saving shortcuts:", e);
    }
}

export function resetShortcuts() {
    localStorage.removeItem(STORAGE_KEY);
    loadShortcuts(); // Reload defaults
}

export const actionDescriptions = {
    PREV_IMAGE: '이전 이미지',
    NEXT_IMAGE: '다음 이미지',
    PREV_LABEL: '이전 라벨',
    NEXT_LABEL: '다음 라벨',
    ADD_OBJECT: '객체 추가',
    DELETE_OBJECT: '객체 삭제',
    CANCEL_ACTION: '동작 취소',
    UNDO: '실행 취소 (Ctrl/Cmd+Z)',
    SAVE: '저장 (Ctrl/Cmd+S)',
    SELECT_CLASS_1: '클래스 1 선택',
    SELECT_CLASS_2: '클래스 2 선택',
    SELECT_CLASS_3: '클래스 3 선택',
    SELECT_CLASS_4: '클래스 4 선택',
    SELECT_CLASS_5: '클래스 5 선택',
    SELECT_CLASS_6: '클래스 6 선택',
    SELECT_CLASS_7: '클래스 7 선택',
    SELECT_CLASS_8: '클래스 8 선택',
    SELECT_CLASS_9: '클래스 9 선택',
};

// Initial load
loadShortcuts();
