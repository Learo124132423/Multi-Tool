const EditorTool = {
    selectedImage: null,
    lastSavedPath: null,
    pendingResult: null,
    resultAction: null,
    initialized: false,
    busy: false,

    init() {
        if (this.initialized) return;
        this.setupEventListeners();
        this.initialized = true;
    },

    setupEventListeners() {
        const dropZone = document.getElementById('editor-drop-zone');
        const fileInput = document.getElementById('editor-input');

        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => this.selectImage(e.target.files[0]);

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        };
        dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.selectImage(e.dataTransfer.files[0]);
        };

        document.getElementById('editor-quality').addEventListener('input', (e) => {
            document.getElementById('editor-quality-value').textContent = e.target.value + '%';
        });

        document.getElementById('editor-remove-bg-btn').addEventListener('click', () => {
            this.removeBackground();
        });
        document.getElementById('editor-compress-btn').addEventListener('click', () => {
            this.reduceQuality();
        });
        document.getElementById('editor-save-btn').addEventListener('click', () => {
            this.saveImage();
        });
        document.getElementById('editor-reveal-btn').addEventListener('click', () => {
            if (this.lastSavedPath) app.revealPath(this.lastSavedPath);
        });
    },

    selectImage(file) {
        if (!file) return;

        if (this.busy) {
            app.showToast('Please wait for the current edit to finish', 'danger');
            return;
        }

        const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
        const imageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
        if (!file.type.startsWith('image/') && !imageExtensions.includes(extension)) {
            app.showToast('Please select an image file', 'danger');
            return;
        }

        this.selectedImage = window.api.getPathForFile(file);
        this.lastSavedPath = null;
        this.pendingResult = null;
        this.resultAction = null;

        document.getElementById('editor-file-name').textContent = file.name;
        document.getElementById('editor-preview').src = app.toFileUrl(this.selectedImage);
        document.getElementById('editor-preview-badge').style.display = 'none';
        document.getElementById('editor-workspace').style.display = 'block';
        document.getElementById('editor-status').style.display = 'none';
        document.getElementById('editor-status-detail').textContent = '';
        document.getElementById('editor-save-result').style.display = 'none';
        document.getElementById('editor-save-path').textContent = '';
        document.getElementById('editor-save-btn').style.display = 'inline-block';
        document.getElementById('editor-reveal-btn').style.display = 'none';
    },

    removeBackground() {
        if (!this.selectedImage) {
            app.showToast('Please select an image first', 'danger');
            return;
        }
        if (!app.removeBgKey) {
            app.showToast('Add your remove.bg API key in Settings first', 'danger');
            return;
        }
        this.start('Removing background...', 'This can take a few seconds.');
        window.api.send('editor-remove-bg', { filePath: this.selectedImage });
    },

    reduceQuality() {
        if (!this.selectedImage) {
            app.showToast('Please select an image first', 'danger');
            return;
        }

        const quality = parseInt(document.getElementById('editor-quality').value, 10) || 70;
        const format = document.getElementById('editor-format').value;
        this.start('Reducing quality...', `Compressing to ${format.toUpperCase()} at ${quality}% quality.`);
        window.api.send('editor-compress', { filePath: this.selectedImage, quality, format });
    },

    start(message, detail) {
        this.busy = true;
        this.lastSavedPath = null;
        this.pendingResult = null;
        this.resultAction = null;

        document.getElementById('editor-remove-bg-btn').disabled = true;
        document.getElementById('editor-compress-btn').disabled = true;
        document.getElementById('editor-status').style.display = 'block';
        document.getElementById('editor-loader').style.display = 'block';
        document.getElementById('editor-status-text').textContent = message;
        document.getElementById('editor-status-detail').textContent = detail || '';
        document.getElementById('editor-save-result').style.display = 'none';
        document.getElementById('editor-save-path').textContent = '';
        document.getElementById('editor-save-btn').style.display = 'inline-block';
        document.getElementById('editor-reveal-btn').style.display = 'none';
    },

    handleResult(data) {
        this.busy = false;
        document.getElementById('editor-remove-bg-btn').disabled = false;
        document.getElementById('editor-compress-btn').disabled = false;
        document.getElementById('editor-loader').style.display = 'none';

        if (!data || !data.success) {
            const message = data && data.error ? data.error : 'The edit failed';
            document.getElementById('editor-status-text').textContent = 'Error: ' + message;
            document.getElementById('editor-status-detail').textContent = data?.hint || '';
            document.getElementById('editor-save-result').style.display = 'none';
            app.showToast('Edit failed: ' + message, 'danger');
            return;
        }

        this.lastSavedPath = null;
        this.pendingResult = {
            previewPath: data.previewPath,
            sourcePath: data.sourcePath,
            suggestedName: data.suggestedName
        };
        this.resultAction = data.action;

        const preview = document.getElementById('editor-preview');
        const badge = document.getElementById('editor-preview-badge');
        preview.src = app.toFileUrl(data.previewPath) + '?t=' + Date.now();
        badge.textContent = data.action === 'remove-bg' ? 'Background removed' : 'Quality reduced';
        badge.style.display = 'inline-block';

        let detail = '';
        if (data.action === 'remove-bg') {
            detail = 'Transparent PNG' + (data.newSize ? ' - ' + this.formatBytes(data.newSize) : '');
        } else if (data.action === 'compress') {
            detail = this.formatBytes(data.newSize);
            if (data.originalSize) detail += ' (was ' + this.formatBytes(data.originalSize) + ')';
        }

        const label = data.action === 'remove-bg' ? 'Background removed' : 'Quality reduced';
        document.getElementById('editor-status-text').textContent = label + '. Ready to save.';
        document.getElementById('editor-status-detail').textContent = detail;
        document.getElementById('editor-save-path').textContent = 'Ready to save';
        document.getElementById('editor-save-result').style.display = 'flex';
        document.getElementById('editor-save-btn').style.display = 'inline-block';
        document.getElementById('editor-save-btn').disabled = false;
        document.getElementById('editor-save-btn').textContent = 'Save image';
        document.getElementById('editor-reveal-btn').style.display = 'none';
    },

    saveImage() {
        if (!this.pendingResult) return;

        const button = document.getElementById('editor-save-btn');
        button.disabled = true;
        button.textContent = 'Saving...';
        document.getElementById('editor-status-text').textContent = 'Saving...';
        window.api.send('editor-save', this.pendingResult);
    },

    handleSaveResult(data) {
        const button = document.getElementById('editor-save-btn');
        button.disabled = false;
        button.textContent = 'Save image';

        if (data && data.canceled) {
            const label = this.resultAction === 'remove-bg' ? 'Background removed' : 'Quality reduced';
            document.getElementById('editor-status-text').textContent = label + '. Ready to save.';
            return;
        }

        if (!data || !data.success) {
            const message = data && data.error ? data.error : 'The image could not be saved';
            document.getElementById('editor-status-text').textContent = 'Save failed: ' + message;
            app.showToast('Save failed: ' + message, 'danger');
            return;
        }

        this.lastSavedPath = data.path;
        this.pendingResult = null;
        document.getElementById('editor-preview').src = app.toFileUrl(data.path) + '?t=' + Date.now();
        document.getElementById('editor-save-path').textContent = data.path;
        document.getElementById('editor-save-btn').style.display = 'none';
        document.getElementById('editor-reveal-btn').style.display = 'inline-block';
        document.getElementById('editor-status-text').textContent = 'Saved';
        app.showToast('Saved: ' + data.path, 'success');
    },

    formatBytes(bytes) {
        if (!Number.isFinite(bytes)) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
};

window.api.receive('editor-result', (data) => EditorTool.handleResult(data));
window.api.receive('editor-save-result', (data) => EditorTool.handleSaveResult(data));
