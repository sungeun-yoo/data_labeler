import './shortcutManager.js'; // This will execute the file and load shortcuts
import './colorManager.js'; // This will execute the file and load custom colors
import { initUI } from './ui.js';
import { initializeEventListeners } from './events.js';
import { handleResize } from './canvas.js';

function initialize() {
    initUI();
    initializeEventListeners();

    Split(['#split-0', '#split-1'], {
        sizes: [75, 25],
        minSize: [200, 300],
        gutterSize: 8,
        cursor: 'col-resize',
        onDrag: handleResize
    });
}

initialize();
