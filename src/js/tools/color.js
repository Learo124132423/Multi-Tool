const ColorTool = {
    hue: 217,
    saturation: 1,
    value: 1,
    initialized: false,

    init() {
        if (this.initialized) return;

        this.canvas = document.getElementById('color-sv');
        this.context = this.canvas.getContext('2d', { willReadFrequently: true });
        this.cursor = document.getElementById('color-sv-cursor');
        this.preview = document.getElementById('color-preview');
        this.hexInput = document.getElementById('color-hex-input');
        this.rgbText = document.getElementById('color-rgb');
        this.hslText = document.getElementById('color-hsl');
        this.hueSlider = document.getElementById('color-hue');
        this.status = document.getElementById('color-status');
        this.pickButton = document.getElementById('color-pick-btn');
        this.overlay = null;

        this.setupEventListeners();
        this.setFromHex('#3D8BFF');
        this.initialized = true;
    },

    setupEventListeners() {
        let dragging = false;

        const updateFromPointer = (event) => {
            const rect = this.canvas.getBoundingClientRect();
            this.saturation = this.clamp((event.clientX - rect.left) / rect.width, 0, 1);
            this.value = 1 - this.clamp((event.clientY - rect.top) / rect.height, 0, 1);
            this.updateUI();
        };

        this.canvas.addEventListener('pointerdown', (event) => {
            dragging = true;
            this.canvas.setPointerCapture(event.pointerId);
            updateFromPointer(event);
        });
        this.canvas.addEventListener('pointermove', (event) => {
            if (dragging) updateFromPointer(event);
        });
        this.canvas.addEventListener('pointerup', (event) => {
            dragging = false;
            try { this.canvas.releasePointerCapture(event.pointerId); } catch (e) { /* ignore */ }
        });
        this.canvas.addEventListener('pointercancel', () => { dragging = false; });

        this.hueSlider.addEventListener('input', (event) => {
            this.hue = parseFloat(event.target.value);
            this.drawSaturationValue();
            this.updateUI();
        });

        this.hexInput.addEventListener('input', () => {
            const rgb = this.parseHex(this.hexInput.value);
            if (rgb) this.setFromRgb(rgb.r, rgb.g, rgb.b);
        });
        this.hexInput.addEventListener('blur', () => this.updateUI());
        this.hexInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') this.hexInput.blur();
        });

        document.getElementById('color-copy-hex').addEventListener('click', () => this.copy(this.hexInput.value));
        document.getElementById('color-copy-rgb').addEventListener('click', () => this.copy(this.rgbText.textContent));
        this.pickButton.addEventListener('click', () => this.startScreenPick());
    },

    drawSaturationValue() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.context.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
        this.context.fillRect(0, 0, width, height);

        const white = this.context.createLinearGradient(0, 0, width, 0);
        white.addColorStop(0, '#ffffff');
        white.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.context.fillStyle = white;
        this.context.fillRect(0, 0, width, height);

        const black = this.context.createLinearGradient(0, 0, 0, height);
        black.addColorStop(0, 'rgba(0, 0, 0, 0)');
        black.addColorStop(1, '#000000');
        this.context.fillStyle = black;
        this.context.fillRect(0, 0, width, height);
    },

    setFromHex(hex) {
        const rgb = this.parseHex(hex);
        if (!rgb) return false;
        this.setFromRgb(rgb.r, rgb.g, rgb.b);
        return true;
    },

    setFromRgb(r, g, b) {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;

        this.value = max;
        this.saturation = max === 0 ? 0 : delta / max;

        if (delta === 0) {
            this.hue = 0;
        } else if (max === rn) {
            this.hue = 60 * (((gn - bn) / delta) % 6);
        } else if (max === gn) {
            this.hue = 60 * ((bn - rn) / delta + 2);
        } else {
            this.hue = 60 * ((rn - gn) / delta + 4);
        }

        if (this.hue < 0) this.hue += 360;
        this.hueSlider.value = Math.round(this.hue);
        this.drawSaturationValue();
        this.updateUI();
    },

    updateUI() {
        const rgb = this.hsvToRgb(this.hue, this.saturation, this.value);
        const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);

        if (document.activeElement !== this.hexInput) {
            this.hexInput.value = hex;
        }

        this.preview.style.backgroundColor = hex;
        this.rgbText.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        this.hslText.textContent = this.rgbToHslText(rgb.r, rgb.g, rgb.b);
        this.cursor.style.left = `${this.saturation * 100}%`;
        this.cursor.style.top = `${(1 - this.value) * 100}%`;
        this.cursor.style.backgroundColor = hex;
    },

    hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r = 0;
        let g = 0;
        let b = 0;

        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    },

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
    },

    rgbToHslText(r, g, b) {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;
        const lightness = (max + min) / 2;
        let hue = 0;
        let saturation = 0;

        if (delta !== 0) {
            saturation = delta / (1 - Math.abs(2 * lightness - 1));
            if (max === rn) hue = 60 * (((gn - bn) / delta) % 6);
            else if (max === gn) hue = 60 * ((bn - rn) / delta + 2);
            else hue = 60 * ((rn - gn) / delta + 4);
        }

        if (hue < 0) hue += 360;
        return `hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
    },

    parseHex(value) {
        let hex = String(value || '').trim();
        if (!hex.startsWith('#')) hex = '#' + hex;

        if (/^#[0-9a-f]{3}$/i.test(hex)) {
            hex = '#' + hex.slice(1).split('').map(char => char + char).join('');
        }
        if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;

        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16)
        };
    },

    startScreenPick() {
        if (this.overlay) return;

        this.pickButton.disabled = true;
        let remaining = 3;
        this.status.textContent = `Switch to the tab with the color. Capturing in ${remaining}...`;

        window.api.send('capture-screens', { delay: 3000 });

        const timer = setInterval(() => {
            remaining -= 1;
            if (remaining > 0) {
                this.status.textContent = `Switch to the tab with the color. Capturing in ${remaining}...`;
            } else {
                clearInterval(timer);
                this.status.textContent = 'Capturing screen...';
            }
        }, 1000);
    },

    handleScreens(data) {
        if (!data || data.error) {
            this.status.textContent = 'Screen capture failed' + (data && data.error ? ': ' + data.error : '');
            this.pickButton.disabled = false;
            return;
        }

        if (!Array.isArray(data.screens) || data.screens.length === 0) {
            this.status.textContent = 'No screens were captured.';
            this.pickButton.disabled = false;
            return;
        }

        this.showOverlay(data.screens);
    },

    showOverlay(screens) {
        const overlay = document.createElement('div');
        overlay.className = 'screen-pick-overlay';

        const header = document.createElement('div');
        header.className = 'screen-pick-header';

        const title = document.createElement('span');
        title.textContent = 'Click the color you want to pick. Esc cancels.';

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn-small';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => this.closeOverlay('Screen pick cancelled.'));

        header.append(title, cancel);

        const list = document.createElement('div');
        list.className = 'screen-pick-screens';

        screens.forEach((screen) => {
            const item = document.createElement('div');
            item.className = 'screen-pick-item';

            const image = document.createElement('img');
            image.src = screen.dataUrl;
            image.alt = screen.name;
            image.addEventListener('click', (event) => {
                event.stopPropagation();
                const rgb = this.sampleImage(image, event);
                if (!rgb) return;
                this.setFromRgb(rgb.r, rgb.g, rgb.b);
                const hex = this.hexInput.value;
                this.closeOverlay(`Picked ${hex}`);
                app.showToast('Color picked: ' + hex, 'success');
            });

            const caption = document.createElement('div');
            caption.className = 'screen-pick-caption';
            caption.textContent = `${screen.name} · ${screen.displayWidth} × ${screen.displayHeight}`;

            item.append(image, caption);
            list.append(item);
        });

        overlay.append(header, list);
        document.body.append(overlay);
        this.overlay = overlay;

        this.overlayKeyHandler = (event) => {
            if (event.key === 'Escape') this.closeOverlay('Screen pick cancelled.');
        };
        document.addEventListener('keydown', this.overlayKeyHandler);
    },

    sampleImage(image, event) {
        const rect = image.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) * (image.naturalWidth / rect.width));
        const y = Math.floor((event.clientY - rect.top) * (image.naturalHeight / rect.height));

        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = image.naturalWidth;
        sampleCanvas.height = image.naturalHeight;
        const context = sampleCanvas.getContext('2d', { willReadFrequently: true });

        try {
            context.drawImage(image, 0, 0);
            const data = context.getImageData(
                Math.max(0, Math.min(image.naturalWidth - 1, x)),
                Math.max(0, Math.min(image.naturalHeight - 1, y)),
                1,
                1
            ).data;
            return { r: data[0], g: data[1], b: data[2] };
        } catch (error) {
            this.status.textContent = 'Could not read the captured pixel: ' + error.message;
            return null;
        }
    },

    closeOverlay(message) {
        if (!this.overlay) return;
        this.overlay.remove();
        this.overlay = null;
        this.pickButton.disabled = false;

        if (this.overlayKeyHandler) {
            document.removeEventListener('keydown', this.overlayKeyHandler);
            this.overlayKeyHandler = null;
        }

        this.status.textContent = message || '';
    },

    copy(text) {
        navigator.clipboard.writeText(text);
        app.showToast('Copied to clipboard!', 'success');
    },

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
};

window.api.receive('screens-data', (data) => ColorTool.handleScreens(data));

window.ColorTool = ColorTool;
