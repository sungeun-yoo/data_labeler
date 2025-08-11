const STORAGE_KEY = 'customClassColors';

let customColors = {};

export function loadCustomColors() {
    try {
        const storedColors = localStorage.getItem(STORAGE_KEY);
        if (storedColors) {
            customColors = JSON.parse(storedColors);
        }
    } catch (e) {
        console.error("Failed to load custom colors.", e);
        customColors = {};
    }
}

export function getCustomColor(className) {
    return customColors[className];
}

export function setCustomColor(className, color) {
    customColors[className] = color;
    _save();
}

function _save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customColors));
    } catch (e) {
        console.error("Failed to save custom colors.", e);
    }
}

// Initial load when the module is imported.
loadCustomColors();
