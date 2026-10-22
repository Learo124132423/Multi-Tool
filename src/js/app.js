const app = {
    currentTool: 'menu',

    init() {
        if (typeof renderIcons === 'function') renderIcons();
        this.setupNavigation();
        this.setupEventListeners();
        this.loadSettings();
        
        // Listen for IPC events
        window.api.receive('settings-data', (data) => {
            this.applySettings(data);
        });

        window.api.receive('settings-saved', (data) => {
            if (data && data.success) {
                this.applySettings(data.settings);
                this.showToast('Settings saved', 'success');
            } else {
                this.showToast('Could not save settings: ' + ((data && data.error) || 'unknown error'), 'danger');
            }
        });

        window.api.receive('selected-folder', (path) => {
            document.getElementById('dl-folder').textContent = path;
            document.getElementById('settings-folder').textContent = path;
        });

        window.api.receive('update-status', (data) => {
            this.updateStatus(data);
        });

        window.api.receive('download-progress', (data) => {
            this.updateProgress(data);
        });

        window.api.receive('download-complete', (data) => {
            this.lastDownloadPath = data.path || '';
            document.getElementById('dl-loader').style.display = 'none';
            document.querySelector('#dl-progress-box .progress-bar').style.display = 'block';
            document.getElementById('dl-progress-fill').style.width = '100%';
            document.getElementById('dl-status').textContent = 'Download complete';
            document.getElementById('dl-error-hint').style.display = 'none';
            document.getElementById('dl-save-path').textContent = data.path || '';
            document.getElementById('dl-save-result').style.display = data.path ? 'flex' : 'none';
            document.getElementById('dl-download-btn').disabled = false;
            this.showToast('Download complete!', 'success');
        });

        window.api.receive('download-error', (data) => {
            document.getElementById('dl-loader').style.display = 'none';
            document.querySelector('#dl-progress-box .progress-bar').style.display = 'block';
            document.getElementById('dl-progress-fill').style.width = '0%';
            document.getElementById('dl-status').textContent = 'Error: ' + data.message;
            const hint = document.getElementById('dl-error-hint');
            hint.textContent = data.hint || '';
            hint.style.display = data.hint ? 'block' : 'none';
            document.getElementById('dl-save-result').style.display = 'none';
            document.getElementById('dl-download-btn').disabled = false;
            this.showToast('Error: ' + data.message, 'danger');
        });

        window.api.receive('qr-data', (data) => {
            const res = document.getElementById('qr-result');
            this.lastQrDataUrl = data.url;
            res.innerHTML = `<img src="${data.url}" alt="Generated QR code" class="qr-image">`;
            document.getElementById('qr-download-btn').style.display = 'inline-block';
            this.showToast('QR Code Generated', 'success');
        });

        window.api.receive('qr-save-result', (data) => {
            if (data.success) {
                this.lastQrSavePath = data.path;
                document.getElementById('qr-reveal-btn').style.display = 'inline-block';
                this.showToast('QR code saved: ' + data.path, 'success');
            } else {
                this.showToast('Error: ' + data.error, 'danger');
            }
        });

        window.api.receive('media-status', (data) => {
            this.updateMediaStatus(data);
        });
    },

    setupNavigation() {
        document.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', () => {
                this.switchTool(card.dataset.tool);
            });
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            this.switchTool('menu');
        });
    },

    switchTool(toolId) {
        this.currentTool = toolId;
        const isMenu = toolId === 'menu';
        const card = document.querySelector(`.tool-card[data-tool="${toolId}"]`);

        // Menu vs panels
        document.getElementById('menu-view').classList.toggle('active', isMenu);
        document.getElementById('tool-panels').classList.toggle('active', !isMenu);

        // Back button visibility
        document.getElementById('back-btn').style.display = isMenu ? 'none' : 'block';

        // Title: tool name inside a tool, app name on menu
        document.getElementById('brand').style.display = isMenu ? 'flex' : 'none';
        document.getElementById('tool-title').textContent = isMenu
            ? 'All Tools'
            : card.querySelector('.card-name').textContent;

        // Active panel
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        if (!isMenu) {
            const activePanel = document.getElementById(`panel-${toolId}`);
            if (activePanel) {
                activePanel.classList.add('active');
                // Initialize tool-specific logic
                if (toolId === 'thumbnail' && typeof ThumbnailTool !== 'undefined') {
                    ThumbnailTool.init();
                } else if (toolId === 'editor' && typeof EditorTool !== 'undefined') {
                    EditorTool.init();
                } else if (toolId === 'converter' && typeof ConverterTool !== 'undefined') {
                    ConverterTool.init();
                } else if (toolId === 'ocr' && typeof OCRTool !== 'undefined') {
                    OCRTool.init();
                } else if (toolId === 'pdf' && typeof PDFTool !== 'undefined') {
                    PDFTool.init();
                } else if (toolId === 'gif' && typeof GIFTool !== 'undefined') {
                    GIFTool.init();
                } else if (toolId === 'color' && typeof ColorTool !== 'undefined') {
                    ColorTool.init();
                } else if (toolId === 'calculator' && typeof CalculatorTool !== 'undefined') {
                    CalculatorTool.init();
                    setTimeout(() => document.getElementById('calc-display').focus(), 0);
                }
            }
        }
    },

    setupEventListeners() {
        // Unified Downloader
        document.getElementById('dl-download-btn').addEventListener('click', () => {
            const url = document.getElementById('dl-url').value.trim();
            const format = document.getElementById('dl-format').value;
            const filename = document.getElementById('dl-filename').value.trim();
            if (!url) return this.showToast('Please enter a link', 'danger');

            this.resetProgress();
            document.getElementById('dl-download-btn').disabled = true;
            window.api.send('download-media', { url, format, filename });
        });

        document.getElementById('dl-url').addEventListener('input', () => {
            this.updateDownloaderFormat();
        });
        this.updateDownloaderFormat();

        // QR
        document.getElementById('qr-generate-btn').addEventListener('click', () => {
            const text = document.getElementById('qr-text').value;
            if (!text) return this.showToast('Please enter text', 'danger');
            document.getElementById('qr-reveal-btn').style.display = 'none';
            const width = parseInt(document.getElementById('qr-size').value, 10) || 512;
            window.api.send('generate-qr', {
                text,
                options: { width, margin: 2, errorCorrectionLevel: 'M' }
            });
        });

        document.getElementById('qr-download-btn').addEventListener('click', () => {
            if (!this.lastQrDataUrl) return this.showToast('Generate a QR code first', 'danger');
            window.api.send('qr-save', { dataUrl: this.lastQrDataUrl });
        });

        this.setupClearButtons();

        // Media Converter (images + audio/video)
        const mediaDrop = document.getElementById('media-drop-zone');
        const mediaInput = document.getElementById('media-input');
        const selectMedia = (file) => this.selectMediaFile(file);

        mediaDrop.onclick = () => mediaInput.click();
        mediaInput.onchange = (e) => selectMedia(e.target.files[0]);

        mediaDrop.ondragover = (e) => {
            e.preventDefault();
            mediaDrop.classList.add('drag-over');
        };
        mediaDrop.ondragleave = () => mediaDrop.classList.remove('drag-over');
        mediaDrop.ondrop = (e) => {
            e.preventDefault();
            mediaDrop.classList.remove('drag-over');
            selectMedia(e.dataTransfer.files[0]);
        };

        document.getElementById('media-convert-btn').addEventListener('click', () => {
            if (!this.selectedMediaPath) return this.showToast('Please select a file first', 'danger');
            const action = document.getElementById('media-action').value;

            this.resetMediaStatus();
            document.getElementById('media-convert-btn').disabled = true;

            if (this.selectedMediaKind === 'image') {
                let options = {};
                let imageAction = action;
                if (action === 'compress') options = { quality: 80 };
                if (action === 'webp') { imageAction = 'convert'; options = { format: 'webp' }; }
                if (action === 'png') { imageAction = 'convert'; options = { format: 'png' }; }
                window.api.send('image-process', { filePath: this.selectedMediaPath, action: imageAction, options });
            } else {
                window.api.send('file-convert', { filePath: this.selectedMediaPath, format: action });
            }
        });

        // Downloader folder picker
        document.getElementById('dl-folder-btn').addEventListener('click', () => {
            window.api.send('select-folder');
        });

        // Settings panel
        document.getElementById('settings-folder-btn').addEventListener('click', () => {
            window.api.send('select-folder');
        });

        document.getElementById('settings-save-btn').addEventListener('click', () => {
            const key = document.getElementById('settings-removebg-key').value.trim();
            window.api.send('save-settings', { removeBgApiKey: key });
        });

        document.getElementById('settings-check-update-btn').addEventListener('click', () => {
            document.getElementById('settings-update-status').textContent = 'Checking for updates...';
            window.api.send('check-for-updates');
        });

        document.getElementById('settings-install-update-btn').addEventListener('click', () => {
            window.api.send('install-update');
        });

        document.querySelectorAll('.settings-link').forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                window.api.send('open-external', link.dataset.url);
            });
        });

        // Reveal saved files
        document.getElementById('media-reveal-btn').addEventListener('click', () => {
            this.revealPath(this.lastMediaPath);
        });
        document.getElementById('dl-reveal-btn').addEventListener('click', () => {
            this.revealPath(this.lastDownloadPath);
        });
        document.getElementById('qr-reveal-btn').addEventListener('click', () => {
            this.revealPath(this.lastQrSavePath);
        });
    },

    revealPath(targetPath) {
        if (targetPath) window.api.send('open-path', targetPath);
    },

    applySettings(data) {
        if (!data) return;
        this.removeBgKey = data.removeBgApiKey || '';
        document.getElementById('dl-folder').textContent = data.downloadFolder;
        document.getElementById('settings-folder').textContent = data.downloadFolder;
        document.getElementById('settings-removebg-key').value = data.removeBgApiKey || '';
        if (data.version) {
            document.getElementById('settings-version').textContent = data.version;
        }
    },

    updateStatus(data) {
        const status = document.getElementById('settings-update-status');
        const installButton = document.getElementById('settings-install-update-btn');
        if (!status || !data) return;

        if (data.state === 'checking') {
            status.textContent = 'Checking for updates...';
        } else if (data.state === 'available') {
            status.textContent = 'Version ' + data.version + ' is available. Downloading...';
        } else if (data.state === 'none') {
            status.textContent = 'You are up to date.';
        } else if (data.state === 'downloading') {
            status.textContent = 'Downloading update: ' + data.percent + '%';
        } else if (data.state === 'ready') {
            status.textContent = 'Version ' + data.version + ' is ready to install.';
        } else if (data.state === 'error') {
            status.textContent = 'Update check failed: ' + (data.message || 'unknown error');
        } else if (data.state === 'dev') {
            status.textContent = data.message || 'Updates are only checked in the installed app.';
        }

        installButton.style.display = data.state === 'ready' ? 'inline-block' : 'none';
    },

    setupClearButtons() {
        document.querySelectorAll('[data-clear]').forEach(button => {
            const input = document.getElementById(button.dataset.clear);
            if (!input) return;

            const update = () => button.classList.toggle('visible', input.value.length > 0);
            input.addEventListener('input', update);
            button.addEventListener('click', () => {
                input.value = '';
                input.dispatchEvent(new Event('input'));
                input.focus();
            });
            update();
        });
    },

    selectMediaFile(file) {
        if (!file) return;

        const path = window.api.getPathForFile(file);
        const name = file.name;
        const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
        let kind = 'video';

        if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) {
            kind = 'image';
        } else if (file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
            kind = 'audio';
        }

        this.selectedMediaPath = path;
        this.selectedMediaKind = kind;

        document.getElementById('media-file-name').textContent = 'Selected: ' + name;
        document.getElementById('media-actions').style.display = 'block';

        const actionSelect = document.getElementById('media-action');
        if (kind === 'image') {
            actionSelect.innerHTML = `
                <option value="compress">Compress (JPEG 80%)</option>
                <option value="webp">Convert to WebP</option>
                <option value="png">Convert to PNG</option>`;
        } else {
            actionSelect.innerHTML = `
                <option value="mp3">Convert to MP3</option>
                <option value="wav">Convert to WAV</option>
                <option value="mp4">Convert to MP4</option>
                <option value="mkv">Convert to MKV</option>`;
        }

        const url = this.toFileUrl(path);
        const preview = document.getElementById('media-preview');
        if (kind === 'image') {
            preview.innerHTML = `<img src="${url}" alt="Selected image">`;
        } else if (kind === 'audio') {
            preview.innerHTML = `<audio controls src="${url}"></audio>`;
        } else {
            preview.innerHTML = `<video controls src="${url}"></video>`;
        }
    },

    toFileUrl(filePath) {
        return 'file://' + encodeURI(filePath.replace(/\\/g, '/'));
    },

    isSpotifyUrl(url) {
        return /^spotify:/i.test(url) || /(^|\.)spotify\.com\//i.test(url);
    },

    updateDownloaderFormat() {
        const formatSelect = document.getElementById('dl-format');
        const url = document.getElementById('dl-url').value.trim();
        const previous = formatSelect.value;

        if (this.isSpotifyUrl(url)) {
            formatSelect.innerHTML = '<option value="mp3">MP3 Audio</option>';
            formatSelect.disabled = true;
        } else {
            formatSelect.innerHTML = `
                <option value="mp4">MP4 Video</option>
                <option value="mp3">MP3 Audio</option>`;
            formatSelect.disabled = false;
            if (previous === 'mp3') formatSelect.value = 'mp3';
        }
    },

    updateProgress(data) {
        const fill = document.getElementById('dl-progress-fill');
        const loader = document.getElementById('dl-loader');
        const bar = document.querySelector('#dl-progress-box .progress-bar');
        const status = document.getElementById('dl-status');

        if (data.indeterminate) {
            loader.style.display = 'block';
            bar.style.display = 'none';
            status.textContent = 'Processing with spotdl...';
            return;
        }

        if (data.percent !== undefined) {
            loader.style.display = 'none';
            bar.style.display = 'block';
            fill.style.width = data.percent + '%';
            status.textContent = `Downloading: ${data.percent}%`;
        }
    },

    resetProgress() {
        document.getElementById('dl-progress-box').style.display = 'block';
        document.getElementById('dl-progress-fill').style.width = '0%';
        document.getElementById('dl-loader').style.display = 'none';
        document.querySelector('#dl-progress-box .progress-bar').style.display = 'block';
        document.getElementById('dl-status').textContent = 'Starting...';
        document.getElementById('dl-error-hint').style.display = 'none';
        document.getElementById('dl-save-result').style.display = 'none';
        document.getElementById('dl-save-path').textContent = '';
    },

    updateMediaStatus(data) {
        if (!data) return;

        const box = document.getElementById('media-status');
        const loader = document.getElementById('media-loader');
        const bar = document.getElementById('media-progress-bar');
        const fill = document.getElementById('media-progress-fill');
        const text = document.getElementById('media-status-text');
        const detail = document.getElementById('media-status-detail');
        const result = document.getElementById('media-save-result');
        const resultPath = document.getElementById('media-save-path');
        const convertButton = document.getElementById('media-convert-btn');

        if (data.state === 'started') {
            box.style.display = 'block';
            result.style.display = 'none';
            resultPath.textContent = '';
            detail.textContent = '';
            loader.style.display = data.indeterminate ? 'block' : 'none';
            bar.style.display = data.indeterminate ? 'none' : 'block';
            fill.style.width = '0%';
            text.textContent = data.label || 'Working...';
            convertButton.disabled = true;
        } else if (data.state === 'progress') {
            loader.style.display = 'none';
            bar.style.display = 'block';
            fill.style.width = data.percent + '%';
            text.textContent = `Converting: ${data.percent}%`;
        } else if (data.state === 'done') {
            this.lastMediaPath = data.path;
            loader.style.display = 'none';
            bar.style.display = 'block';
            fill.style.width = '100%';
            text.textContent = data.label || 'Done';
            detail.textContent = '';
            resultPath.textContent = data.path;
            result.style.display = 'flex';
            convertButton.disabled = false;
            this.showToast((data.kind === 'image' ? 'Image saved: ' : 'File saved: ') + data.path, 'success');
        } else if (data.state === 'error') {
            loader.style.display = 'none';
            bar.style.display = 'none';
            text.textContent = 'Error: ' + data.message;
            detail.textContent = '';
            result.style.display = 'none';
            convertButton.disabled = false;
            this.showToast('Conversion failed: ' + data.message, 'danger');
        }
    },

    resetMediaStatus() {
        document.getElementById('media-status').style.display = 'none';
        document.getElementById('media-progress-fill').style.width = '0%';
        document.getElementById('media-loader').style.display = 'none';
        document.getElementById('media-save-result').style.display = 'none';
        document.getElementById('media-save-path').textContent = '';
        document.getElementById('media-status-detail').textContent = '';
        document.getElementById('media-status-text').textContent = 'Converting...';
    },

    loadSettings() {
        window.api.send('get-settings');
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.backgroundColor = type === 'success' ? 'var(--success)' : (type === 'danger' ? 'var(--danger)' : 'var(--accent)');
        toast.innerText = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

app.init();
