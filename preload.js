const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
    send: (channel, data) => {
        const validChannels = [
            'download-media',
            'get-settings', 'select-folder',
            'calculate', 'generate-qr', 'qr-save', 'capture-screens',
            'image-process', 'file-convert',
            'editor-remove-bg', 'editor-compress', 'editor-save',
            'thumb-fetch', 'thumb-save',
            'get-rates',
            'ocr-run', 'ocr-save',
            'pdf-merge', 'pdf-split', 'pdf-rotate', 'pdf-img-to-pdf', 'pdf-to-images', 'pdf-compress',
            'gif-create', 'gif-cancel',
            'open-path', 'open-external',
            'save-settings', 'check-for-updates', 'install-update'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        const validChannels = [
            'download-progress', 'download-complete', 'download-error',
            'settings-data', 'settings-saved', 'selected-folder', 'update-status',
            'qr-data', 'qr-save-result', 'screens-data', 'calculation-result',
            'media-status', 'editor-result', 'editor-save-result',
            'thumb-results', 'thumb-error',
            'thumb-save-result',
            'rates-data', 'rates-error',
            'ocr-progress', 'ocr-result', 'ocr-save-result',
            'pdf-merge-result', 'pdf-split-result', 'pdf-rotate-result', 'pdf-img-to-pdf-result', 'pdf-to-images-result', 'pdf-compress-result',
            'gif-progress', 'gif-result'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    removeListener: (channel, func) => {
        ipcRenderer.removeListener(channel, func);
    },
    getPathForFile: (file) => webUtils.getPathForFile(file)
});
