import './shortcutManager.js'; // This will execute the file and load shortcuts
import './colorManager.js'; // This will execute the file and load custom colors
import { initUI } from './ui.js';
import { initializeEventListeners } from './events.js';
import { handleResize } from './canvas.js';

function initialize() {
    initUI();
    initializeEventListeners();

    // Main horizontal split (3-way)
    const mainSplit = Split(['#left-panel', '#split-0', '#split-1'], {
        sizes: [0, 75, 25], // Initially hide the left panel
        minSize: [0, 200, 300],
        gutterSize: 8,
        cursor: 'col-resize',
        onDrag: handleResize
    });

    // Vertical split for the left panel
    const leftSplit = Split(['#label-sidebar', '#image-list-sidebar'], {
        direction: 'vertical',
        sizes: [50, 50],
        minSize: [100, 100],
        gutterSize: 8,
        cursor: 'row-resize',
    });

    // Store splits for later access if needed, e.g., to adjust sizes
    window.appSplits = { mainSplit, leftSplit };
}

initialize();
