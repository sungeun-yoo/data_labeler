import { initUI } from './ui.js';
import { initializeEventListeners } from './events.js';
import { loadDefaultConfig } from './file.js';

async function initialize() {
    initUI();
    initializeEventListeners();
    await loadDefaultConfig();
}

initialize();
