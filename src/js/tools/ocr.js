const OCRTool = {
    selectedLanguages: ['eng'],
    selectedImage: null,
    initialized: false,

    init() {
        if (this.initialized) return;
        this.setupEventListeners();
        this.updateLanguageDisplay();
        this.initialized = true;
    },

    setupEventListeners() {
        const dropZone = document.getElementById('ocr-drop-zone');
        const fileInput = document.getElementById('ocr-input');

        dropZone.onclick = () => fileInput.click();

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) this.selectImage(file);
        };

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        };

        dropZone.ondragleave = () => dropZone.classList.remove('drag-over');

        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.selectImage(file);
            }
        };

        document.getElementById('ocr-languages').addEventListener('change', (e) => {
            this.selectedLanguages = Array.from(e.target.selectedOptions).map(o => o.value);
        });

        document.getElementById('ocr-run-btn').addEventListener('click', () => this.runOCR());

        document.getElementById('ocr-copy-btn').addEventListener('click', () => {
            const text = document.getElementById('ocr-result').value;
            if (!text.trim()) return app.showToast('No text to copy', 'danger');
            navigator.clipboard.writeText(text);
            app.showToast('Copied to clipboard!', 'success');
        });

        document.getElementById('ocr-save-btn').addEventListener('click', () => {
            const text = document.getElementById('ocr-result').value;
            if (!text.trim()) return app.showToast('No text to save', 'danger');
            window.api.send('ocr-save', { text, sourcePath: this.selectedImage });
        });

        document.getElementById('ocr-reveal-btn').addEventListener('click', () => {
            if (this.lastSavedPath) app.revealPath(this.lastSavedPath);
        });

        document.getElementById('ocr-clear-btn').addEventListener('click', () => this.reset());
    },

    selectImage(file) {
        this.selectedImage = window.api.getPathForFile(file);
        document.getElementById('ocr-selected-name').textContent = 'Selected: ' + file.name;
        document.getElementById('ocr-actions').style.display = 'block';
        document.getElementById('ocr-run-row').style.display = 'flex';
        document.getElementById('ocr-status').textContent = '';
        this.showPreview(this.selectedImage);
    },

    showPreview(imagePath) {
        const preview = document.getElementById('ocr-preview');
        const url = 'file://' + encodeURI(imagePath.replace(/\\/g, '/'));
        preview.innerHTML = `<img src="${url}" alt="OCR input preview">`;
    },

    runOCR() {
        if (!this.selectedImage) return app.showToast('Please select an image first', 'danger');
        if (this.selectedLanguages.length === 0) return app.showToast('Select at least one language', 'danger');

        const btn = document.getElementById('ocr-run-btn');
        const status = document.getElementById('ocr-status');
        const resultBox = document.getElementById('ocr-result');

        btn.disabled = true;
        btn.textContent = 'Processing...';
        status.textContent = 'Starting OCR...';
        resultBox.value = '';

        window.api.send('ocr-run', {
            filePath: this.selectedImage,
            languages: this.selectedLanguages
        });
    },

    showProgress(data) {
        if (!data) return;
        const status = document.getElementById('ocr-status');
        const percent = Number.isFinite(data.progress) ? Math.round(data.progress * 100) : null;
        status.textContent = data.status + (percent !== null ? ` (${percent}%)` : '');
    },

    handleResult(data) {
        const btn = document.getElementById('ocr-run-btn');
        const status = document.getElementById('ocr-status');
        const resultBox = document.getElementById('ocr-result');

        btn.disabled = false;
        btn.textContent = 'Run OCR';

        if (data && data.success) {
            resultBox.value = data.text || '';
            status.textContent = 'Done!';
            app.showToast('OCR complete', 'success');
        } else {
            const message = data && data.error ? data.error : 'Unknown OCR error';
            status.textContent = 'Error: ' + message;
            app.showToast('OCR failed: ' + message, 'danger');
        }
    },

    reset() {
        this.selectedImage = null;
        document.getElementById('ocr-input').value = '';
        document.getElementById('ocr-selected-name').textContent = '';
        document.getElementById('ocr-actions').style.display = 'none';
        document.getElementById('ocr-run-row').style.display = 'none';
        document.getElementById('ocr-preview').innerHTML = '';
        document.getElementById('ocr-result').value = '';
        document.getElementById('ocr-status').textContent = '';
        document.getElementById('ocr-reveal-btn').style.display = 'none';
        this.lastSavedPath = null;

        const btn = document.getElementById('ocr-run-btn');
        btn.disabled = false;
        btn.textContent = 'Run OCR';
    },

    updateLanguageDisplay() {
        const select = document.getElementById('ocr-languages');
        const options = {
            eng: 'English',
            khm: 'Khmer (ខ្មែរ)',
            chi_sim: 'Chinese Simplified (简体中文)'
        };

        select.innerHTML = Object.entries(options).map(([code, name]) =>
            `<option value="${code}" ${this.selectedLanguages.includes(code) ? 'selected' : ''}>${name}</option>`
        ).join('');
    }
};

window.api.receive('ocr-progress', (data) => OCRTool.showProgress(data));
window.api.receive('ocr-result', (data) => OCRTool.handleResult(data));
window.api.receive('ocr-save-result', (data) => {
    if (data.success) {
        OCRTool.lastSavedPath = data.path;
        document.getElementById('ocr-reveal-btn').style.display = 'inline-block';
        app.showToast('Saved: ' + data.path, 'success');
    } else {
        app.showToast('Error: ' + data.error, 'danger');
    }
});

window.OCRTool = OCRTool;
