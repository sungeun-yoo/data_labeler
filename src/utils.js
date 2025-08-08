let notificationTimeout;

export function showNotification(message, type = 'info', ui) {
    clearTimeout(notificationTimeout);
    const el = ui.toastPopup;
    el.textContent = message;

    el.className = 'toast-popup'; // Reset classes
    el.classList.add(type);
    el.classList.add('show');

    notificationTimeout = setTimeout(() => {
        el.classList.remove('show');
    }, 2500);
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

export function screenToWorld(x, y, transform) {
    return { x: (x - transform.offsetX) / transform.scale, y: (y - transform.offsetY) / transform.scale };
}

export function isPointInBbox(point, bbox) {
    if (!bbox) return false;
    const [x1, y1, x2, y2] = bbox;
    return point.x >= Math.min(x1, x2) && point.x <= Math.max(x1, x2) &&
           point.y >= Math.min(y1, y2) && point.y <= Math.max(y1, y2);
}

export function getResizeHandleAt(worldPos, bbox, transform) {
    if (!bbox) return null;
    const [x1, y1, x2, y2] = bbox;
    const handleSize = 8 / transform.scale;
    const handles = { tl: [x1, y1], tr: [x2, y1], bl: [x1, y2], br: [x2, y2] };
    for (const key in handles) {
        const [hx, hy] = handles[key];
        if (Math.abs(worldPos.x - hx) < handleSize / 2 && Math.abs(worldPos.y - hy) < handleSize / 2) {
            return key;
        }
    }
    return null;
}

// Color palette for classes
const CLASS_COLORS = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
    '#FF5722', '#795548', '#9E9E9E', '#607D8B'
];

export function getColorForClass(className, allClassNames = []) {
    const index = allClassNames.indexOf(className);
    if (index === -1) {
        // Fallback for safety, though it shouldn't be needed
        return '#FFFFFF';
    }
    return CLASS_COLORS[index % CLASS_COLORS.length];
}
