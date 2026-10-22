const PDFTool = {
    initialized: false,
    files: {
        merge: [],
        split: [],
        rotate: [],
        'img-to-pdf': [],
        'to-images': [],
        compress: []
    },

    ops: [
        { op: 'merge', drop: 'pdf-drop-zone', input: 'pdf-input', list: 'pdf-file-list', clear: 'pdf-clear-btn', btn: 'pdf-merge-btn', multiple: true, kind: 'pdf', min: 2 },
        { op: 'split', drop: 'pdf-split-drop-zone', input: 'pdf-split-input', list: 'pdf-split-file-list', clear: 'pdf-split-clear-btn', btn: 'pdf-split-btn', multiple: false, kind: 'pdf', min: 1 },
        { op: 'rotate', drop: 'pdf-rotate-drop-zone', input: 'pdf-rotate-input', list: 'pdf-rotate-file-list', clear: 'pdf-rotate-clear-btn', btn: 'pdf-rotate-btn', multiple: false, kind: 'pdf', min: 1 },
        { op: 'img-to-pdf', drop: 'pdf-img-drop-zone', input: 'pdf-img-input', list: 'pdf-img-file-list', clear: 'pdf-img-clear-btn', btn: 'pdf-img-to-pdf-btn', multiple: true, kind: 'image', min: 1 },
        { op: 'to-images', drop: 'pdf-to-images-drop-zone', input: 'pdf-to-images-input', list: 'pdf-to-images-file-list', clear: 'pdf-to-images-clear-btn', btn: 'pdf-to-images-btn', multiple: false, kind: 'pdf', min: 1 },
        { op: 'compress', drop: 'pdf-compress-drop-zone', input: 'pdf-compress-input', list: 'pdf-compress-file-list', clear: 'pdf-compress-clear-btn', btn: 'pdf-compress-btn', multiple: false, kind: 'pdf', min: 1 }
    ],

    init() {
        if (this.initialized) return;

        document.querySelectorAll('.pdf-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        this.ops.forEach(cfg => this.setupDropZone(cfg));

        document.getElementById('pdf-merge-btn').addEventListener('click', () => this.mergePDFs());
        document.getElementById('pdf-split-btn').addEventListener('click', () => this.splitPDF());
        document.getElementById('pdf-rotate-btn').addEventListener('click', () => this.rotatePDF());
        document.getElementById('pdf-img-to-pdf-btn').addEventListener('click', () => this.imagesToPDF());
        document.getElementById('pdf-to-images-btn').addEventListener('click', () => this.pdfToImages());
        document.getElementById('pdf-compress-btn').addEventListener('click', () => this.compressPDF());

        document.getElementById('pdf-compress-method').addEventListener('change', (e) => {
            document.getElementById('compress-rasterize-options').style.display =
                e.target.value === 'rasterize' ? 'flex' : 'none';
        });

        document.getElementById('pdf-reveal-btn').addEventListener('click', () => {
            if (this.lastSavedPath) app.revealPath(this.lastSavedPath);
        });

        window.api.receive('pdf-merge-result', (data) => this.handleResult(data, 'merge'));
        window.api.receive('pdf-split-result', (data) => this.handleResult(data, 'split'));
        window.api.receive('pdf-rotate-result', (data) => this.handleResult(data, 'rotate'));
        window.api.receive('pdf-img-to-pdf-result', (data) => this.handleResult(data, 'img-to-pdf'));
        window.api.receive('pdf-to-images-result', (data) => this.handleResult(data, 'to-images'));
        window.api.receive('pdf-compress-result', (data) => this.handleResult(data, 'compress'));

        this.ops.forEach(cfg => this.updateFileList(cfg));

        this.initialized = true;
    },

    setupDropZone(cfg) {
        const dropZone = document.getElementById(cfg.drop);
        const fileInput = document.getElementById(cfg.input);
        const clearBtn = document.getElementById(cfg.clear);

        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const accepted = Array.from(e.target.files).filter(f =>
                cfg.kind === 'image' ? f.type.startsWith('image/') : f.type === 'application/pdf'
            );
            if (accepted.length) this.addFiles(cfg, accepted);
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
            const accepted = Array.from(e.dataTransfer.files).filter(f =>
                cfg.kind === 'image' ? f.type.startsWith('image/') : f.type === 'application/pdf'
            );
            if (accepted.length) this.addFiles(cfg, accepted);
        });

        clearBtn.addEventListener('click', () => this.clearFiles(cfg));
    },

    addFiles(cfg, files) {
        const mapped = files.map(f => ({
            path: window.api.getPathForFile(f),
            name: f.name,
            size: f.size
        }));

        if (cfg.multiple) {
            this.files[cfg.op] = this.files[cfg.op].concat(mapped);
        } else {
            this.files[cfg.op] = mapped.slice(0, 1);
        }

        document.getElementById(cfg.input).value = '';
        this.updateFileList(cfg);
    },

    updateFileList(cfg) {
        const list = document.getElementById(cfg.list);
        const clearBtn = document.getElementById(cfg.clear);
        const btn = document.getElementById(cfg.btn);
        const selected = this.files[cfg.op];

        list.innerHTML = '';
        selected.forEach((f, i) => {
            const row = document.createElement('div');
            row.className = 'file-item';

            const span = document.createElement('span');
            span.textContent = `${f.name} (${this.formatSize(f.size)})`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-small';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => this.removeFile(cfg, i));

            row.append(span, removeBtn);
            list.appendChild(row);
        });

        clearBtn.style.display = selected.length > 0 ? 'inline-flex' : 'none';
        btn.disabled = selected.length < cfg.min;
    },

    removeFile(cfg, index) {
        this.files[cfg.op].splice(index, 1);
        this.updateFileList(cfg);
    },

    clearFiles(cfg) {
        this.files[cfg.op] = [];
        this.updateFileList(cfg);
    },

    switchTab(tabId) {
        document.querySelectorAll('.pdf-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.pdf-panel').forEach(p => p.classList.remove('active'));
        document.querySelector(`.pdf-tab[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`pdf-panel-${tabId}`).classList.add('active');
    },

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // --- Operations ---

    mergePDFs() {
        if (this.files.merge.length < 2) return app.showToast('Need at least 2 PDFs', 'danger');
        this.setLoading('merge', true);
        window.api.send('pdf-merge', { files: this.files.merge.map(f => f.path) });
    },

    splitPDF() {
        if (this.files.split.length !== 1) return app.showToast('Select exactly 1 PDF', 'danger');
        const start = parseInt(document.getElementById('pdf-split-start').value, 10) || 1;
        const end = parseInt(document.getElementById('pdf-split-end').value, 10) || 0;
        this.setLoading('split', true);
        window.api.send('pdf-split', { file: this.files.split[0].path, start, end });
    },

    rotatePDF() {
        if (this.files.rotate.length !== 1) return app.showToast('Select exactly 1 PDF', 'danger');
        const angle = parseInt(document.getElementById('pdf-rotate-angle').value, 10) || 90;
        this.setLoading('rotate', true);
        window.api.send('pdf-rotate', { file: this.files.rotate[0].path, angle });
    },

    imagesToPDF() {
        if (!this.files['img-to-pdf'].length) return app.showToast('Add images first', 'danger');
        this.setLoading('img-to-pdf', true);
        window.api.send('pdf-img-to-pdf', { files: this.files['img-to-pdf'].map(f => f.path) });
    },

    pdfToImages() {
        if (this.files['to-images'].length !== 1) return app.showToast('Select exactly 1 PDF', 'danger');
        const dpi = parseInt(document.getElementById('pdf-to-images-dpi').value, 10) || 150;
        const format = document.getElementById('pdf-to-images-format').value || 'png';
        this.setLoading('to-images', true);
        window.api.send('pdf-to-images', { file: this.files['to-images'][0].path, dpi, format });
    },

    compressPDF() {
        if (this.files.compress.length !== 1) return app.showToast('Select exactly 1 PDF', 'danger');
        const method = document.getElementById('pdf-compress-method').value;
        const quality = parseInt(document.getElementById('pdf-compress-quality').value, 10) || 70;
        const dpi = parseInt(document.getElementById('pdf-compress-dpi').value, 10) || 150;
        this.setLoading('compress', true);
        window.api.send('pdf-compress', {
            file: this.files.compress[0].path,
            method,
            quality,
            dpi
        });
    },

    setLoading(op, loading) {
        const cfg = this.ops.find(o => o.op === op);
        if (!cfg) return;
        const btn = document.getElementById(cfg.btn);
        if (!btn) return;

        if (!btn.dataset.label) btn.dataset.label = btn.textContent;
        btn.disabled = loading;
        btn.textContent = loading ? 'Processing...' : btn.dataset.label;

        if (!loading) {
            btn.disabled = this.files[op].length < cfg.min;
        }
    },

    handleResult(data, op) {
        this.setLoading(op, false);
        if (data.success) {
            this.lastSavedPath = data.path;
            document.getElementById('pdf-save-path').textContent = data.path;
            document.getElementById('pdf-save-result').style.display = 'flex';
            app.showToast('Saved: ' + data.path, 'success');
        } else {
            document.getElementById('pdf-save-result').style.display = 'none';
            app.showToast('Error: ' + data.error, 'danger');
        }
    }
};

window.PDFTool = PDFTool;
