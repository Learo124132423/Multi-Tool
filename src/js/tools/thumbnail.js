const ThumbnailTool = {
    selectedThumbnails: [],
    selectedIndex: 0,
    initialized: false,

    init() {
        if (this.initialized) return;
        this.setupEventListeners();
        this.initialized = true;
    },

    setupEventListeners() {
        document.getElementById('thumb-fetch-btn').addEventListener('click', () => {
            const url = document.getElementById('thumb-url').value.trim();
            if (!url) return app.showToast('Please enter a video link', 'danger');
            this.fetchThumbnails(url);
        });

        document.getElementById('thumb-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('thumb-fetch-btn').click();
        });

        document.getElementById('thumb-resolution').addEventListener('change', (e) => {
            this.selectThumbnail(parseInt(e.target.value, 10));
        });

        document.getElementById('thumb-save-btn').addEventListener('click', () => {
            const thumb = this.selectedThumbnails[this.selectedIndex];
            if (thumb) this.saveThumbnail(thumb);
        });

        document.getElementById('thumb-reveal-btn').addEventListener('click', () => {
            if (this.lastSavedPath) app.revealPath(this.lastSavedPath);
        });
    },

    fetchThumbnails(url) {
        const status = document.getElementById('thumb-status');
        const area = document.getElementById('thumb-result-area');
        area.style.display = 'none';
        document.getElementById('thumb-save-result').style.display = 'none';
        this.selectedThumbnails = [];
        status.textContent = 'Fetching thumbnails...';
        window.api.send('thumb-fetch', { url });
    },

    displayThumbnails(thumbnails) {
        const status = document.getElementById('thumb-status');
        const area = document.getElementById('thumb-result-area');
        const select = document.getElementById('thumb-resolution');

        if (!thumbnails || thumbnails.length === 0) {
            status.textContent = 'No thumbnails found';
            area.style.display = 'none';
            return;
        }

        this.selectedThumbnails = thumbnails;
        status.textContent = `Found ${thumbnails.length} thumbnail${thumbnails.length === 1 ? '' : 's'}`;

        select.innerHTML = thumbnails.map((thumb, index) => {
            const size = thumb.size ? ` · ${this.formatSize(thumb.size)}` : '';
            const best = index === 0 ? ' — highest' : '';
            return `<option value="${index}">${thumb.width || '?'} × ${thumb.height || '?'}${best}${size}</option>`;
        }).join('');

        area.style.display = 'block';
        this.selectThumbnail(0);
    },

    selectThumbnail(index) {
        if (!Number.isInteger(index) || !this.selectedThumbnails[index]) return;

        this.selectedIndex = index;
        const thumb = this.selectedThumbnails[index];
        const preview = document.getElementById('thumb-preview-img');
        const select = document.getElementById('thumb-resolution');

        select.value = String(index);
        preview.src = thumb.url;
        document.getElementById('thumb-meta').textContent =
            `${thumb.width || '?'} × ${thumb.height || '?'}${thumb.size ? ' · ' + this.formatSize(thumb.size) : ''}`;
    },

    formatSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    saveThumbnail(thumb) {
        app.showToast('Downloading...', 'info');
        window.api.send('thumb-save', {
            url: thumb.url,
            filename: thumb.filename || 'thumbnail.jpg'
        });
    }
};

window.api.receive('thumb-results', (thumbnails) => {
    ThumbnailTool.displayThumbnails(thumbnails);
});

window.api.receive('thumb-error', (err) => {
    document.getElementById('thumb-status').textContent = 'Error: ' + err.message;
    app.showToast('Error: ' + err.message, 'danger');
});

window.api.receive('thumb-save-result', (data) => {
    if (data.success) {
        ThumbnailTool.lastSavedPath = data.path;
        document.getElementById('thumb-save-path').textContent = data.path;
        document.getElementById('thumb-save-result').style.display = 'flex';
        app.showToast('Thumbnail saved: ' + data.path, 'success');
    } else {
        app.showToast('Error: ' + data.error, 'danger');
    }
});

window.ThumbnailTool = ThumbnailTool;
