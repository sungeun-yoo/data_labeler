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
