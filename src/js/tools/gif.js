const GIFTool = {
    initialized: false,
    selectedFile: null,
    processing: false,

    init() {
        if (this.initialized) return;
        this.setupEventListeners();
        this.initialized = true;
    },

    setupEventListeners() {
        const dropZone = document.getElementById('gif-drop-zone');
        const fileInput = document.getElementById('gif-input');

        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.selectFile(file);
        });

        ['dragover', 'dragenter'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'dragend'].forEach(evt => {
            dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'));
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                fileInput.files = e.dataTransfer.files;
                this.selectFile(file);
            }
        });

        document.getElementById('gif-crop-enable').addEventListener('change', (e) => {
            document.getElementById('gif-crop-options').style.display = e.target.checked ? 'grid' : 'none';
        });

        document.getElementById('gif-create-btn').addEventListener('click', () => this.createGIF());
        document.getElementById('gif-cancel-btn').addEventListener('click', () => {
            window.api.send('gif-cancel');
        });
        document.getElementById('gif-clear-btn').addEventListener('click', () => this.reset());
        document.getElementById('gif-reveal-btn').addEventListener('click', () => {
            if (this.lastSavedPath) app.revealPath(this.lastSavedPath);
        });

        window.api.receive('gif-progress', (data) => this.updateProgress(data));
        window.api.receive('gif-result', (data) => this.handleResult(data));
    },

    toFileUrl(filePath) {
        return 'file:///' + filePath
            .replace(/\\/g, '/')
            .replace(/ /g, '%20')
            .replace(/#/g, '%23')
            .replace(/\?/g, '%3F');
    },

    selectFile(file) {
        this.selectedFile = {
            path: window.api.getPathForFile(file),
            name: file.name,
            size: file.size
        };

        const info = document.getElementById('gif-file-info');
        const src = this.toFileUrl(this.selectedFile.path);
        info.innerHTML = `
            <p class="gif-file-name">${this.selectedFile.name} (${this.formatSize(this.selectedFile.size)})</p>
            <video class="gif-preview-video" src="${src}" controls muted preload="metadata"></video>
        `;

        document.getElementById('gif-settings').style.display = 'block';
        document.getElementById('gif-create-btn').disabled = false;
        document.getElementById('gif-result-preview').innerHTML = '';
        this.resetProgress();
    },

    buildOptions() {
        const cropEnabled = document.getElementById('gif-crop-enable').checked;
        const text = document.getElementById('gif-text').value;

        return {
            file: this.selectedFile.path,
            start: parseFloat(document.getElementById('gif-start').value) || 0,
            duration: parseFloat(document.getElementById('gif-duration').value) || 0,
            fps: parseInt(document.getElementById('gif-fps').value, 10) || 15,
            width: parseInt(document.getElementById('gif-width').value, 10) || 480,
            speed: parseFloat(document.getElementById('gif-speed').value) || 1,
            reverse: document.getElementById('gif-reverse').checked,
            crop: {
                enabled: cropEnabled,
                x: parseFloat(document.getElementById('gif-crop-x').value) || 0,
                y: parseFloat(document.getElementById('gif-crop-y').value) || 0,
                width: parseFloat(document.getElementById('gif-crop-w').value) || 0,
                height: parseFloat(document.getElementById('gif-crop-h').value) || 0
            },
            text,
            fontSize: parseInt(document.getElementById('gif-text-size').value, 10) || 28,
            position: document.getElementById('gif-text-pos').value,
            loop: parseInt(document.getElementById('gif-loop').value, 10)
        };
    },

    createGIF() {
        if (!this.selectedFile) return app.showToast('Select a video first', 'danger');
        if (this.processing) return;

        const options = this.buildOptions();
        if (options.duration <= 0) return app.showToast('Duration must be greater than 0', 'danger');

        this.setProcessing(true);
        document.getElementById('gif-progress-box').style.display = 'block';
        document.getElementById('gif-progress-fill').style.width = '0%';
        document.getElementById('gif-status').textContent = 'Starting ffmpeg...';

        window.api.send('gif-create', options);
    },

    setProcessing(active) {
        this.processing = active;
        document.getElementById('gif-create-btn').disabled = active || !this.selectedFile;
        document.getElementById('gif-create-btn').textContent = active ? 'Creating...' : 'Create GIF';
        document.getElementById('gif-cancel-btn').style.display = active ? 'inline-flex' : 'none';
    },

    updateProgress(data) {
        document.getElementById('gif-progress-fill').style.width = data.percent + '%';
        document.getElementById('gif-status').textContent = `Rendering: ${data.percent}%`;
    },

    handleResult(data) {
        this.setProcessing(false);
        const status = document.getElementById('gif-status');

        if (data.success) {
            status.textContent = 'Done!';
            document.getElementById('gif-progress-fill').style.width = '100%';
            document.getElementById('gif-result-preview').innerHTML = `
                <p class="gif-result-label">Preview</p>
                <img class="gif-result-img" src="${this.toFileUrl(data.path)}" alt="Generated GIF">
            `;
            this.lastSavedPath = data.path;
            document.getElementById('gif-save-path').textContent = data.path;
            document.getElementById('gif-save-result').style.display = 'flex';
            app.showToast('GIF created: ' + data.path, 'success');
        } else if (data.error === 'Cancelled') {
            status.textContent = 'Cancelled';
            document.getElementById('gif-progress-box').style.display = 'none';
            app.showToast('GIF creation cancelled', 'info');
        } else {
            status.textContent = 'Error';
            document.getElementById('gif-progress-box').style.display = 'none';
            app.showToast('GIF failed: ' + data.error, 'danger');
        }
    },

    resetProgress() {
        document.getElementById('gif-progress-box').style.display = 'none';
        document.getElementById('gif-progress-fill').style.width = '0%';
        document.getElementById('gif-status').textContent = 'Preparing...';
    },

    reset() {
        this.selectedFile = null;
        document.getElementById('gif-input').value = '';
        document.getElementById('gif-file-info').innerHTML = '';
        document.getElementById('gif-settings').style.display = 'none';
        document.getElementById('gif-create-btn').disabled = true;
        document.getElementById('gif-result-preview').innerHTML = '';
        document.getElementById('gif-crop-enable').checked = false;
        document.getElementById('gif-crop-options').style.display = 'none';
        document.getElementById('gif-text').value = '';
        document.getElementById('gif-save-result').style.display = 'none';
        document.getElementById('gif-save-path').textContent = '';
        this.lastSavedPath = null;
        this.resetProgress();
    },

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
};

window.GIFTool = GIFTool;
