const { app, BrowserWindow, ipcMain, dialog, Menu, desktopCapturer, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');
const math = require('mathjs');
const QRCode = require('qrcode');
const sharp = require('sharp');

let mainWindow;

function createWindow() {
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#1a1a1a',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        initAutoUpdater();
    });

    // Handle external links (optional, for later)
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- Settings Management ---
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let settings = {
    downloadFolder: path.join(app.getPath('home'), 'Downloads'),
    theme: 'dark',
    removeBgApiKey: ''
};

if (fs.existsSync(settingsPath)) {
    try {
        settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsPath)) };
    } catch (e) { console.error('Failed to load settings', e); }
}

ipcMain.on('get-settings', (event) => {
    event.reply('settings-data', { ...settings, version: app.getVersion() });
});

ipcMain.on('select-folder', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (!result.canceled) {
        settings.downloadFolder = result.filePaths[0];
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        event.reply('selected-folder', result.filePaths[0]);
    }
});

ipcMain.on('save-settings', (event, updates = {}) => {
    try {
        if (typeof updates !== 'object' || updates === null) {
            throw new Error('Invalid settings');
        }
        if (typeof updates.removeBgApiKey === 'string') {
            settings.removeBgApiKey = updates.removeBgApiKey.trim();
        }
        if (typeof updates.downloadFolder === 'string' && updates.downloadFolder) {
            settings.downloadFolder = updates.downloadFolder;
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        event.reply('settings-saved', { success: true, settings });
    } catch (error) {
        event.reply('settings-saved', { success: false, error: error.message });
    }
});

ipcMain.on('open-external', (event, url) => {
    if (typeof url === 'string' && /^https:\/\//i.test(url)) {
        shell.openExternal(url).catch(() => { /* ignore */ });
    }
});

// --- Auto Updates ---
let updater = null;

function sendUpdateStatus(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', payload);
    }
}

function initAutoUpdater() {
    if (!app.isPackaged) {
        return;
    }
    try {
        updater = require('electron-updater').autoUpdater;
    } catch (error) {
        console.error('Auto-updater unavailable:', error.message);
        return;
    }

    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;

    updater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking' }));
    updater.on('update-available', (info) => sendUpdateStatus({ state: 'available', version: info.version }));
    updater.on('update-not-available', () => sendUpdateStatus({ state: 'none' }));
    updater.on('download-progress', (progress) => sendUpdateStatus({ state: 'downloading', percent: Math.round(progress.percent) }));
    updater.on('update-downloaded', (info) => sendUpdateStatus({ state: 'ready', version: info.version }));
    updater.on('error', (error) => sendUpdateStatus({ state: 'error', message: error.message }));

    updater.checkForUpdatesAndNotify().catch(() => { /* offline or no release yet */ });
}

ipcMain.on('check-for-updates', async (event) => {
    if (!updater) {
        event.reply('update-status', app.isPackaged
            ? { state: 'error', message: 'The updater is not available.' }
            : { state: 'dev', message: 'Updates are only checked in the installed app.' });
        return;
    }
    try {
        await updater.checkForUpdates();
    } catch (error) {
        event.reply('update-status', { state: 'error', message: error.message });
    }
});

ipcMain.on('install-update', () => {
    if (updater) updater.quitAndInstall();
});

// --- Tool Services (Stubs for now, will implement fully later) ---

// QR Code Generator
ipcMain.on('generate-qr', async (event, { text, options }) => {
    try {
        const url = await QRCode.toDataURL(text, options);
        event.reply('qr-data', { url });
    } catch (err) {
        console.error(err);
    }
});

ipcMain.on('qr-save', async (event, { dataUrl }) => {
    try {
        if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
            throw new Error('No QR code to save');
        }

        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save QR Code',
            defaultPath: path.join(settings.downloadFolder, 'qrcode.png'),
            filters: [{ name: 'PNG Image', extensions: ['png'] }]
        });

        if (result.canceled || !result.filePath) return;

        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'));
        event.reply('qr-save-result', { success: true, path: result.filePath });
    } catch (error) {
        event.reply('qr-save-result', { success: false, error: error.message });
    }
});

// Screen capture for the color picker
ipcMain.on('capture-screens', async (event, { delay = 0 } = {}) => {
    try {
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, Math.min(10000, delay)));
        }

        if (mainWindow) {
            mainWindow.hide();
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        const displays = screen.getAllDisplays();
        const primary = screen.getPrimaryDisplay();
        const maxWidth = Math.max(...displays.map(display => display.size.width * display.scaleFactor));
        const maxHeight = Math.max(...displays.map(display => display.size.height * display.scaleFactor));

        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: Math.round(maxWidth), height: Math.round(maxHeight) },
            fetchWindowIcons: false
        });

        const captures = sources.map((source) => {
            const display = displays.find(item => String(item.id) === source.display_id) || primary;
            return {
                name: source.name,
                dataUrl: source.thumbnail.toDataURL(),
                width: source.thumbnail.getSize().width,
                height: source.thumbnail.getSize().height,
                displayWidth: display.size.width,
                displayHeight: display.size.height
            };
        });

        mainWindow.show();
        mainWindow.focus();
        event.reply('screens-data', { screens: captures });
    } catch (error) {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
        event.reply('screens-data', { error: error.message });
    }
});

// Calculator
let mathDeg = null;

function getMathEngine(angleMode) {
    if (angleMode !== 'deg') return math;

    if (!mathDeg) {
        mathDeg = math.create(math.all, {});
        mathDeg.import({
            sin: (x) => Math.sin(x * Math.PI / 180),
            cos: (x) => Math.cos(x * Math.PI / 180),
            tan: (x) => Math.tan(x * Math.PI / 180),
            asin: (x) => Math.asin(x) * 180 / Math.PI,
            acos: (x) => Math.acos(x) * 180 / Math.PI,
            atan: (x) => Math.atan(x) * 180 / Math.PI
        }, { override: true });
    }

    return mathDeg;
}

ipcMain.on('calculate', (event, payload) => {
    const isObject = payload !== null && typeof payload === 'object';
    const expression = isObject ? payload.expression : payload;
    const angleMode = isObject && payload.angleMode === 'deg' ? 'deg' : 'rad';
    const preview = !!(isObject && payload.preview);
    const reqId = isObject ? payload.reqId : undefined;

    try {
        if (typeof expression !== 'string' || !expression.trim()) {
            throw new Error('Empty expression');
        }

        const engine = getMathEngine(angleMode);
        const value = engine.evaluate(expression);
        const result = engine.format(value, { precision: 12 });

        event.reply('calculation-result', { result, preview, reqId });
    } catch (err) {
        event.reply('calculation-result', { error: err.message, preview, reqId });
    }
});

// Downloaders
const YTDLP_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'bin', 'yt-dlp.exe')
    : path.join(__dirname, 'resources', 'bin', 'yt-dlp.exe');

function sanitizeFilename(name) {
    return String(name || '')
        .replace(/[<>:"/\\|?*{}\u0000-\u001f]/g, '')
        .replace(/[. ]+$/g, '')
        .trim()
        .slice(0, 120);
}

function isSpotifyUrl(url) {
    return /^spotify:/i.test(url) || /(^|\.)spotify\.com\//i.test(url);
}

function findExecutable(command, candidates) {
    const locator = process.platform === 'win32' ? 'where' : 'which';

    try {
        const result = spawnSync(locator, [command], { encoding: 'utf8', windowsHide: true });
        if (result.status === 0) {
            const found = result.stdout
                .split(/\r?\n/)
                .map(line => line.trim())
                .find(line => line && fs.existsSync(line));
            if (found) return found;
        }
    } catch (e) {
        // Ignore lookup failures and fall back to known install paths
    }

    return candidates.find(candidate => candidate && fs.existsSync(candidate)) || null;
}

function getYoutubeRuntimeArgs() {
    const runtimes = [];

    const deno = findExecutable('deno', [
        path.join(process.env.USERPROFILE || '', '.deno', 'bin', 'deno.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'deno', 'bin', 'deno.exe')
    ]);
    if (deno) runtimes.push(`deno:${deno}`);

    const node = findExecutable('node', [
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe')
    ]);
    if (node) runtimes.push(`node:${node}`);

    if (runtimes.length === 0) {
        return ['--js-runtimes', 'deno', '--js-runtimes', 'node', '--js-runtimes', 'quickjs', '--js-runtimes', 'bun'];
    }

    return runtimes.flatMap(runtime => ['--js-runtimes', runtime]);
}

function getLastErrorLine(stderr, fallback) {
    const lines = String(stderr || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const errorLine = [...lines].reverse().find(line => /^ERROR:/i.test(line));
    return (errorLine || lines[lines.length - 1] || fallback).replace(/^ERROR:\s*/i, '');
}

function resolveOutputDir(sourcePath) {
    if (sourcePath) {
        const dir = path.dirname(sourcePath);
        if (fs.existsSync(dir)) return dir;
    }
    return settings.downloadFolder;
}

function uniqueOutputPath(filePath) {
    if (!fs.existsSync(filePath)) return filePath;

    const parsed = path.parse(filePath);
    for (let index = 1; index < 1000; index++) {
        const candidate = path.join(parsed.dir, `${parsed.name}_${index}${parsed.ext}`);
        if (!fs.existsSync(candidate)) return candidate;
    }
    return filePath;
}

function runYtDlp(event, url, format, filename) {
    const customName = sanitizeFilename(filename);
    const template = customName
        ? `${customName.replace(/%/g, '%%')}.%(ext)s`
        : '%(title)s.%(ext)s';

    const args = [
        '--newline',
        '--progress',
        '--progress-template', '{"percent": "%(progress._percent_str)s", "speed": "%(progress._speed_str)s", "eta": "%(progress._eta_str)s"}',
        ...getYoutubeRuntimeArgs()
    ];

    if (format === 'mp3') {
        args.push('-x', '--audio-format', 'mp3');
    } else {
        args.push(
            '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
            '--merge-output-format', 'mp4'
        );
    }

    args.push('-o', path.join(settings.downloadFolder, template), url);

    const ytdlp = spawn(YTDLP_PATH, args);
    let stderr = '';
    let failed = false;
    let buffer = '';

    ytdlp.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();

        for (const line of lines) {
            const match = line.match(/"percent":\s*"([^%]+)%"/);
            if (match) {
                const percent = parseFloat(match[1]);
                if (Number.isFinite(percent)) event.reply('download-progress', { percent });
            }
        }
    });

    ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });

    ytdlp.on('error', (error) => {
        failed = true;
        event.reply('download-error', { message: `Could not start yt-dlp: ${error.message}` });
    });

    ytdlp.on('close', (code) => {
        if (failed) return;

        if (code === 0) {
            event.reply('download-complete', { url, path: settings.downloadFolder });
        } else {
            const message = getLastErrorLine(stderr, `yt-dlp failed with code ${code}`);
            const hint = /JavaScript runtime|jsc:/i.test(stderr)
                ? 'Install Node.js or Deno so yt-dlp can solve YouTube challenges.'
                : undefined;
            event.reply('download-error', { message, hint });
        }
    });
}

function runSpotdl(event, url, filename) {
    const customName = sanitizeFilename(filename);
    const outputPath = customName
        ? path.join(settings.downloadFolder, `${customName}.{output-ext}`)
        : settings.downloadFolder;

    const spotdl = spawn('python', ['-m', 'spotdl', 'download', url, '--format', 'mp3', '--output', outputPath]);
    let stderr = '';
    let failed = false;

    spotdl.stdout.on('data', () => {
        event.reply('download-progress', { indeterminate: true });
    });

    spotdl.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });

    spotdl.on('error', (error) => {
        failed = true;
        event.reply('download-error', {
            message: `Could not start spotdl: ${error.message}. Make sure Python and spotdl are installed.`
        });
    });

    spotdl.on('close', (code) => {
        if (failed) return;

        if (code === 0) {
            event.reply('download-complete', { url, path: settings.downloadFolder });
        } else {
            event.reply('download-error', { message: getLastErrorLine(stderr, `spotdl failed with code ${code}`) });
        }
    });
}

ipcMain.on('download-media', (event, { url, format, filename }) => {
    let target = typeof url === 'string' ? url.trim() : '';

    if (!target) {
        event.reply('download-error', { message: 'No link provided' });
        return;
    }

    if (!/^(https?:\/\/|spotify:)/i.test(target)) {
        if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(target)) {
            target = 'https://' + target;
        } else {
            event.reply('download-error', { message: 'Please enter a valid http(s) or Spotify link' });
            return;
        }
    }

    if (isSpotifyUrl(target)) {
        runSpotdl(event, target, filename);
    } else {
        runYtDlp(event, target, format === 'mp3' ? 'mp3' : 'mp4', filename);
    }
});

ipcMain.on('open-path', (event, targetPath) => {
    if (typeof targetPath !== 'string' || !targetPath) return;

    try {
        if (fs.existsSync(targetPath)) {
            const stats = fs.statSync(targetPath);
            if (stats.isDirectory()) shell.openPath(targetPath);
            else shell.showItemInFolder(targetPath);
        } else {
            const dir = path.dirname(targetPath);
            if (fs.existsSync(dir)) shell.openPath(dir);
        }
    } catch (e) {
        console.error('Failed to reveal path:', e.message);
    }
});

// Image Tools
ipcMain.on('image-process', async (event, { filePath, action, options = {} }) => {
    event.reply('media-status', { state: 'started', indeterminate: true, label: 'Processing image...' });

    try {
        const image = sharp(filePath);
        const parsed = path.parse(filePath);
        const outputFormat = action === 'compress' ? 'jpg' : options.format;
        const outName = `processed_${parsed.name}.${outputFormat}`;
        const outPath = uniqueOutputPath(path.join(resolveOutputDir(filePath), outName));

        if (action === 'compress') {
            await image.jpeg({ quality: options.quality || 80 }).toFile(outPath);
        } else if (action === 'convert') {
            await image.toFormat(options.format).toFile(outPath);
        } else if (action === 'resize') {
            await image.resize(options.width, options.height).toFile(outPath);
        }

        event.reply('media-status', { state: 'done', path: outPath, kind: 'image', label: 'Image ready' });
    } catch (err) {
        event.reply('media-status', { state: 'error', message: err.message });
    }
});

function getMediaDuration(filePath) {
    return new Promise((resolve) => {
        const probe = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            filePath
        ]);

        let output = '';
        probe.stdout.on('data', (data) => {
            output += data.toString();
        });
        probe.on('error', () => resolve(0));
        probe.on('close', (code) => {
            const duration = parseFloat(output.trim());
            resolve(code === 0 && Number.isFinite(duration) ? duration : 0);
        });
    });
}

// File Convert (ffmpeg)
ipcMain.on('file-convert', async (event, { filePath, format }) => {
    try {
        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error('Input file not found');
        }

        const parsed = path.parse(filePath);
        const outputDir = resolveOutputDir(filePath);
        let outPath = path.join(outputDir, `${parsed.name}.${format}`);
        if (path.resolve(outPath) === path.resolve(filePath)) {
            outPath = path.join(outputDir, `${parsed.name}_converted.${format}`);
        }
        outPath = uniqueOutputPath(outPath);

        const duration = await getMediaDuration(filePath);

        event.reply('media-status', {
            state: 'started',
            indeterminate: !(duration > 0),
            label: 'Converting...'
        });

        const ffmpeg = spawn('ffmpeg', [
            '-hide_banner',
            '-y',
            '-i', filePath,
            '-progress', 'pipe:1',
            '-nostats',
            outPath
        ]);

        let stderr = '';
        let progressBuffer = '';
        let lastPercent = -1;
        let failed = false;

        ffmpeg.stdout.on('data', (data) => {
            progressBuffer += data.toString();
            const lines = progressBuffer.split(/\r?\n/);
            progressBuffer = lines.pop();

            for (const line of lines) {
                const match = line.match(/^out_time_(?:ms|us)=(\d+)/);
                if (!match || !(duration > 0)) continue;

                const elapsed = parseInt(match[1], 10) / 1000000;
                const percent = Math.max(0, Math.min(99, Math.round((elapsed / duration) * 100)));
                if (percent > lastPercent) {
                    lastPercent = percent;
                    event.reply('media-status', { state: 'progress', percent });
                }
            }
        });

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
            if (stderr.length > 20000) stderr = stderr.slice(-20000);
        });

        ffmpeg.on('error', (error) => {
            failed = true;
            event.reply('media-status', {
                state: 'error',
                message: error.code === 'ENOENT'
                    ? 'ffmpeg was not found. Install ffmpeg and add it to PATH.'
                    : error.message
            });
        });

        ffmpeg.on('close', (code) => {
            if (failed) return;

            if (code === 0 && fs.existsSync(outPath)) {
                event.reply('media-status', {
                    state: 'done',
                    path: outPath,
                    kind: 'media',
                    label: 'Conversion complete'
                });
            } else {
                event.reply('media-status', {
                    state: 'error',
                    message: getLastErrorLine(stderr, `Conversion failed with code ${code}`)
                });
            }
        });
    } catch (error) {
        event.reply('media-status', { state: 'error', message: error.message });
    }
});

// Picture Editor
const REMOVEBG_API_URL = process.env.REMOVEBG_API_URL || 'https://api.remove.bg/v1.0/removebg';
const EDITOR_IMAGE_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
};

let lastEditorTempPath = null;

function isEditorImage(filePath) {
    return EDITOR_IMAGE_TYPES[path.extname(filePath).toLowerCase()] !== undefined;
}

function getEditorTempDir() {
    const dir = path.join(app.getPath('temp'), 'multi-tool-editor');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function getEditorTempPath(filename) {
    const parsed = path.parse(filename);
    return uniqueOutputPath(path.join(getEditorTempDir(), `${parsed.name}_${Date.now()}${parsed.ext}`));
}

function trackEditorTemp(previewPath) {
    if (lastEditorTempPath && lastEditorTempPath !== previewPath) {
        try { fs.unlinkSync(lastEditorTempPath); } catch (e) { /* ignore */ }
    }
    lastEditorTempPath = previewPath;
}

app.on('will-quit', () => {
    if (lastEditorTempPath) {
        try { fs.unlinkSync(lastEditorTempPath); } catch (e) { /* ignore */ }
    }
    try {
        fs.rmSync(path.join(app.getPath('temp'), 'multi-tool-editor'), { recursive: true, force: true });
    } catch (e) { /* ignore */ }
});

ipcMain.on('editor-remove-bg', async (event, { filePath } = {}) => {
    try {
        if (!filePath || !fs.existsSync(filePath) || !isEditorImage(filePath)) {
            throw new Error('Please select a PNG, JPG, or WebP image');
        }

        const apiKey = process.env.REMOVEBG_API_KEY || settings.removeBgApiKey;
        if (!apiKey) {
            throw new Error('No remove.bg API key set. Open Settings and add your own key to remove image backgrounds.');
        }

        const imageBuffer = fs.readFileSync(filePath);
        const mimeType = EDITOR_IMAGE_TYPES[path.extname(filePath).toLowerCase()];
        const form = new FormData();
        form.append('image_file', new Blob([imageBuffer], { type: mimeType }), path.basename(filePath));
        form.append('size', 'auto');
        form.append('format', 'png');

        const response = await fetch(REMOVEBG_API_URL, {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey },
            body: form,
            signal: AbortSignal.timeout(120000)
        });

        if (!response.ok) {
            let message = `Background removal failed (${response.status})`;
            try {
                const payload = await response.json();
                const firstError = payload.errors && payload.errors[0];
                if (firstError) {
                    message = firstError.title || message;
                    if (firstError.detail) message += ': ' + firstError.detail;
                }
            } catch (e) {
                // Fall back to the status-based message
            }

            if (response.status === 402) {
                message = 'remove.bg credits are exhausted. Add credits to your account and try again.';
            } else if (response.status === 401 || response.status === 403) {
                message = 'The remove.bg API key was rejected. Check your key in Settings.';
            } else if (response.status === 429) {
                message = 'Too many background removal requests. Please try again later.';
            }

            throw new Error(message);
        }

        const resultBuffer = Buffer.from(await response.arrayBuffer());
        if (resultBuffer.length === 0) {
            throw new Error('The background remover returned an empty image');
        }

        const parsed = path.parse(filePath);
        const suggestedName = `${parsed.name}_nobg.png`;
        const previewPath = getEditorTempPath(suggestedName);
        fs.writeFileSync(previewPath, resultBuffer);
        trackEditorTemp(previewPath);

        event.reply('editor-result', {
            success: true,
            previewPath,
            sourcePath: filePath,
            suggestedName,
            action: 'remove-bg',
            originalSize: imageBuffer.length,
            newSize: resultBuffer.length
        });
    } catch (error) {
        let message = error.message;
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            message = 'remove.bg took too long to respond. Please try again.';
        } else if (/fetch failed|ENOTFOUND|ECONNREFUSED/i.test(message)) {
            message = 'Could not reach remove.bg. Check your internet connection and try again.';
        }

        const hint = /credits are exhausted/i.test(message)
            ? 'Open remove.bg to add credits, or use Reduce quality in the meantime.'
            : undefined;
        event.reply('editor-result', { success: false, error: message, hint });
    }
});

ipcMain.on('editor-compress', async (event, { filePath, quality, format } = {}) => {
    try {
        if (!filePath || !fs.existsSync(filePath) || !isEditorImage(filePath)) {
            throw new Error('Please select a PNG, JPG, or WebP image');
        }

        const outputFormat = format === 'webp' ? 'webp' : 'jpeg';
        const qualityValue = Math.max(10, Math.min(100, parseInt(quality, 10) || 70));
        const extension = outputFormat === 'webp' ? 'webp' : 'jpg';
        const parsed = path.parse(filePath);
        const suggestedName = `${parsed.name}_compressed.${extension}`;
        const previewPath = getEditorTempPath(suggestedName);
        const originalSize = fs.statSync(filePath).size;

        const image = sharp(filePath).rotate();
        if (outputFormat === 'webp') {
            await image.webp({ quality: qualityValue }).toFile(previewPath);
        } else {
            await image.flatten({ background: '#ffffff' }).jpeg({ quality: qualityValue, mozjpeg: true }).toFile(previewPath);
        }

        trackEditorTemp(previewPath);
        event.reply('editor-result', {
            success: true,
            previewPath,
            sourcePath: filePath,
            suggestedName,
            action: 'compress',
            originalSize,
            newSize: fs.statSync(previewPath).size
        });
    } catch (error) {
        event.reply('editor-result', { success: false, error: error.message });
    }
});

ipcMain.on('editor-save', async (event, { previewPath, sourcePath, suggestedName } = {}) => {
    try {
        if (!previewPath || !fs.existsSync(previewPath)) {
            throw new Error('The edited image is no longer available');
        }

        const tempRoot = path.resolve(getEditorTempDir());
        const candidate = path.resolve(previewPath);
        if (!candidate.toLowerCase().startsWith(tempRoot.toLowerCase() + path.sep)) {
            throw new Error('Invalid edited image');
        }

        const extension = path.extname(previewPath).toLowerCase();
        const safeName = path.basename(suggestedName || path.basename(previewPath));
        const defaultPath = uniqueOutputPath(path.join(resolveOutputDir(sourcePath), safeName));
        const filters = extension === '.png'
            ? [{ name: 'PNG Image', extensions: ['png'] }]
            : extension === '.webp'
                ? [{ name: 'WebP Image', extensions: ['webp'] }]
                : [{ name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }];

        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save edited image',
            defaultPath,
            filters
        });

        if (result.canceled || !result.filePath) {
            event.reply('editor-save-result', { canceled: true });
            return;
        }

        let targetPath = result.filePath;
        if (!path.extname(targetPath)) targetPath += extension;
        fs.copyFileSync(previewPath, targetPath);

        try {
            fs.unlinkSync(previewPath);
            if (lastEditorTempPath === previewPath) lastEditorTempPath = null;
        } catch (e) { /* ignore */ }

        event.reply('editor-save-result', { success: true, path: targetPath });
    } catch (error) {
        event.reply('editor-save-result', { success: false, error: error.message });
    }
});

// Thumbnail Grabber
ipcMain.on('thumb-fetch', async (event, { url }) => {
    try {
        // Use yt-dlp to get video info including thumbnails
        const ytdlp = spawn(YTDLP_PATH, ['-J', '--no-warnings', url]);
        
        let output = '';
        ytdlp.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        ytdlp.stderr.on('data', (data) => {
            console.error(`yt-dlp thumb: ${data}`);
        });
        
        ytdlp.on('close', (code) => {
            if (code !== 0) {
                event.reply('thumb-error', { message: 'Failed to fetch video info' });
                return;
            }
            
            try {
                const info = JSON.parse(output);
                const thumbs = info.thumbnails || [];
                
                // Sort by resolution (prefer larger)
                thumbs.sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0));
                
                // Take top 6
                const selected = thumbs.slice(0, 6).map(t => ({
                    url: t.url,
                    width: t.width,
                    height: t.height,
                    size: t.filesize,
                    filename: `thumbnail_${info.id || 'video'}_${t.width}x${t.height}.jpg`
                }));
                
                event.reply('thumb-results', selected);
            } catch (e) {
                event.reply('thumb-error', { message: 'Failed to parse video info' });
            }
        });
    } catch (e) {
        event.reply('thumb-error', { message: e.message });
    }
});

ipcMain.on('thumb-save', async (event, { url, filename }) => {
    try {
        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 30000
        });
        
        const outPath = uniqueOutputPath(path.join(settings.downloadFolder, path.basename(filename)));
        const writer = fs.createWriteStream(outPath);
        
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        
        event.reply('thumb-save-result', { success: true, path: outPath });
    } catch (e) {
        event.reply('thumb-save-result', { success: false, error: e.message });
    }
});

// Currency Rates
ipcMain.on('get-rates', async (event, { base = 'USD' }) => {
    try {
        const axios = require('axios');
        
        // Try primary API
        let data;
        try {
            const response = await axios.get(`https://open.er-api.com/v6/latest/${base}`, { timeout: 10000 });
            if (response.data.result === 'success') {
                data = response.data;
            } else {
                throw new Error('API returned error');
            }
        } catch (e1) {
            // Fallback to frankfurter
            const response = await axios.get(`https://api.frankfurter.app/latest?from=${base}`, { timeout: 10000 });
            data = response.data;
        }
        
        event.reply('rates-data', { 
            rates: data.rates, 
            base: data.base || base,
            date: data.date || data.time_last_updated_unix 
        });
    } catch (e) {
        event.reply('rates-error', { message: e.message });
    }
});

// OCR
const OCR_LANGUAGES = ['eng', 'khm', 'chi_sim'];

function getUnpackedPath(filePath) {
    if (!app.isPackaged) return filePath;
    return filePath.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
}

function getTessdataPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'tessdata');
    }
    return path.join(__dirname, 'resources', 'tessdata');
}

ipcMain.on('ocr-run', async (event, { filePath, languages } = {}) => {
    let worker;

    try {
        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error('Image file not found');
        }

        const selected = Array.isArray(languages) && languages.length > 0
            ? languages.filter(lang => OCR_LANGUAGES.includes(lang))
            : ['eng'];
        const langs = selected.length > 0 ? selected : ['eng'];

        const { createWorker } = require('tesseract.js');
        const workerPath = getUnpackedPath(require.resolve('tesseract.js/src/worker-script/node/index.js'));
        const cachePath = path.join(app.getPath('userData'), 'tessdata-cache');
        fs.mkdirSync(cachePath, { recursive: true });

        event.reply('ocr-progress', { status: 'Loading OCR engine', progress: 0 });

        worker = await createWorker(langs.join('+'), undefined, {
            langPath: getTessdataPath(),
            workerPath,
            cachePath,
            gzip: false,
            logger: (message) => {
                if (message && message.status) {
                    event.reply('ocr-progress', {
                        status: message.status,
                        progress: message.progress
                    });
                }
            }
        });

        event.reply('ocr-progress', { status: 'Recognizing text', progress: 0 });
        const { data: { text } } = await worker.recognize(filePath);
        event.reply('ocr-result', { success: true, text: text.trim() });
    } catch (error) {
        event.reply('ocr-result', { success: false, error: error.message || String(error) });
    } finally {
        if (worker) {
            try { await worker.terminate(); } catch (e) { /* ignore */ }
        }
    }
});

// OCR Save
ipcMain.on('ocr-save', async (event, { text, sourcePath }) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = sourcePath
            ? `${path.parse(sourcePath).name}_ocr.txt`
            : `ocr_result_${timestamp}.txt`;
        const outPath = uniqueOutputPath(path.join(resolveOutputDir(sourcePath), filename));
        
        fs.writeFileSync(outPath, text, 'utf-8');
        
        event.reply('ocr-save-result', { success: true, path: outPath });
    } catch (e) {
        event.reply('ocr-save-result', { success: false, error: e.message });
    }
});

// PDF Operations
const { PDFDocument } = require('pdf-lib');

// PDF Merge
ipcMain.on('pdf-merge', async (event, { files }) => {
    try {
        if (!files || files.length < 2) {
            event.reply('pdf-merge-result', { success: false, error: 'Need at least 2 PDF files' });
            return;
        }
        
        const mergedPdf = await PDFDocument.create();
        
        for (const filePath of files) {
            const pdfBytes = fs.readFileSync(filePath);
            const pdf = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        
        const mergedBytes = await mergedPdf.save();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outPath = uniqueOutputPath(path.join(resolveOutputDir(files[0]), `merged_${timestamp}.pdf`));
        fs.writeFileSync(outPath, mergedBytes);
        
        event.reply('pdf-merge-result', { success: true, path: outPath });
    } catch (e) {
        event.reply('pdf-merge-result', { success: false, error: e.message });
    }
});

// PDF Split
ipcMain.on('pdf-split', async (event, { file, start, end }) => {
    try {
        const pdfBytes = fs.readFileSync(file);
        const pdf = await PDFDocument.load(pdfBytes);
        const pageCount = pdf.getPageCount();
        
        const startPage = Math.max(1, start) - 1;
        const endPage = end > 0 ? Math.min(end, pageCount) - 1 : pageCount - 1;
        
        if (startPage < 0 || startPage >= pageCount || endPage < startPage) {
            event.reply('pdf-split-result', { success: false, error: 'Invalid page range' });
            return;
        }
        
        const newPdf = await PDFDocument.create();
        const pageIndices = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
        const pages = await newPdf.copyPages(pdf, pageIndices);
        pages.forEach(page => newPdf.addPage(page));
        
        const splitBytes = await newPdf.save();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outPath = uniqueOutputPath(path.join(resolveOutputDir(file), `split_${timestamp}.pdf`));
        fs.writeFileSync(outPath, splitBytes);
        
        event.reply('pdf-split-result', { success: true, path: outPath });
    } catch (e) {
        event.reply('pdf-split-result', { success: false, error: e.message });
    }
});

// PDF Rotate
ipcMain.on('pdf-rotate', async (event, { file, angle }) => {
    try {
        const pdfBytes = fs.readFileSync(file);
        const pdf = await PDFDocument.load(pdfBytes);
        const pageCount = pdf.getPageCount();
        
        const rotation = (angle % 360 + 360) % 360; // Normalize to 0-359
        
        for (let i = 0; i < pageCount; i++) {
            const page = pdf.getPage(i);
            const currentRotation = page.getRotation().angle;
            page.setRotation({ angle: (currentRotation + rotation) % 360 });
        }
        
        const rotatedBytes = await pdf.save();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outPath = uniqueOutputPath(path.join(resolveOutputDir(file), `rotated_${timestamp}.pdf`));
        fs.writeFileSync(outPath, rotatedBytes);
        
        event.reply('pdf-rotate-result', { success: true, path: outPath });
    } catch (e) {
        event.reply('pdf-rotate-result', { success: false, error: e.message });
    }
});

// Images to PDF
ipcMain.on('pdf-img-to-pdf', async (event, { files }) => {
    try {
        if (!files || files.length === 0) {
            event.reply('pdf-img-to-pdf-result', { success: false, error: 'No image files provided' });
            return;
        }
        
        const pdf = await PDFDocument.create();
        
        for (const filePath of files) {
            const imageBytes = fs.readFileSync(filePath);
            let image;
            const ext = path.extname(filePath).toLowerCase();
            
            if (ext === '.jpg' || ext === '.jpeg') {
                image = await pdf.embedJpg(imageBytes);
            } else if (ext === '.png') {
                image = await pdf.embedPng(imageBytes);
            } else {
                // Try to embed as PNG for other formats
                try {
                    image = await pdf.embedPng(imageBytes);
                } catch (e) {
                    continue; // Skip unsupported formats
                }
            }
            
            const page = pdf.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        
        const pdfBytes = await pdf.save();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outPath = uniqueOutputPath(path.join(resolveOutputDir(files[0]), `images_to_pdf_${timestamp}.pdf`));
        fs.writeFileSync(outPath, pdfBytes);
        
        event.reply('pdf-img-to-pdf-result', { success: true, path: outPath });
    } catch (e) {
        event.reply('pdf-img-to-pdf-result', { success: false, error: e.message });
    }
});

// PDF to Images (using pdf.js via renderer would be better, but we can use a simple approach)
ipcMain.on('pdf-to-images', async (event, { file, dpi, format }) => {
    try {
        // This is a placeholder - PDF to images requires pdf.js rendering
        // For now, we'll use a simple approach with pdf-lib (which doesn't support rendering)
        // In a real implementation, this would use pdf.js in the renderer
        event.reply('pdf-to-images-result', { 
            success: false, 
            error: 'PDF to Images requires pdf.js rendering. Please use the renderer-based approach.' 
        });
    } catch (e) {
        event.reply('pdf-to-images-result', { success: false, error: e.message });
    }
});

// PDF Compress
ipcMain.on('pdf-compress', async (event, { file, method, quality, dpi }) => {
    try {
        const pdfBytes = fs.readFileSync(file);
        const pdf = await PDFDocument.load(pdfBytes);
        
        let outputBytes;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        if (method === 'optimize') {
            // Lossless optimization - just re-save with compression
            const optimizedBytes = await pdf.save({ useObjectStreams: true });
            const outPath = uniqueOutputPath(path.join(resolveOutputDir(file), `compressed_${timestamp}.pdf`));
            fs.writeFileSync(outPath, optimizedBytes);
            event.reply('pdf-compress-result', { success: true, path: outPath });
        } else {
            // Rasterize method - requires pdf.js rendering, not possible in main process
            event.reply('pdf-compress-result', { 
                success: false, 
                error: 'Rasterize compression requires pdf.js rendering. Use the Optimize method for lossless compression.' 
            });
        }
    } catch (e) {
        event.reply('pdf-compress-result', { success: false, error: e.message });
    }
});

// --- GIF Creator (ffmpeg) ---
let gifProcess = null;

function escapeDrawtext(text) {
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/%/g, '\\%');
}

function getDrawtextFont() {
    const candidates = [
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/segoeui.ttf',
        'C:/Windows/Fonts/calibri.ttf'
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) return c.replace(/:/g, '\\:');
    }
    return null;
}

ipcMain.on('gif-create', (event, opts) => {
    if (gifProcess) {
        event.reply('gif-result', { success: false, error: 'A GIF is already being created' });
        return;
    }

    const {
        file,
        start = 0,
        duration = 0,
        fps = 15,
        width = 480,
        speed = 1,
        reverse = false,
        crop = null,
        text = '',
        fontSize = 28,
        position = 'bottom',
        loop = 0
    } = opts || {};

    if (!file || !fs.existsSync(file)) {
        event.reply('gif-result', { success: false, error: 'Input video file not found' });
        return;
    }

    const filters = [];
    const speedNum = parseFloat(speed) || 1;
    const fpsNum = Math.max(1, Math.min(60, parseInt(fps, 10) || 15));
    const widthNum = Math.max(16, Math.min(2000, parseInt(width, 10) || 480));

    if (crop && crop.enabled) {
        const cw = Math.max(2, Math.round(parseFloat(crop.width) || 0));
        const ch = Math.max(2, Math.round(parseFloat(crop.height) || 0));
        const cx = Math.max(0, Math.round(parseFloat(crop.x) || 0));
        const cy = Math.max(0, Math.round(parseFloat(crop.y) || 0));
        filters.push(`crop=${cw}:${ch}:${cx}:${cy}`);
    }

    if (speedNum !== 1) {
        filters.push(`setpts=PTS/${speedNum}`);
    }

    if (reverse) filters.push('reverse');

    filters.push(`fps=${fpsNum}`);
    filters.push(`scale=${widthNum}:-1:flags=lanczos`);

    const caption = typeof text === 'string' ? text.trim() : '';
    if (caption) {
        const fontFile = getDrawtextFont();
        const fs = Math.max(8, Math.min(120, parseInt(fontSize, 10) || 28));
        let y;
        if (position === 'top') y = String(Math.round(fs * 0.5));
        else if (position === 'center') y = '(h-text_h)/2';
        else y = `h-text_h-${Math.round(fs * 0.5)}`;

        let drawtext = `drawtext=text='${escapeDrawtext(caption)}'`;
        if (fontFile) drawtext += `:fontfile='${fontFile}'`;
        drawtext += `:fontcolor=white:fontsize=${fs}:x=(w-text_w)/2:y=${y}`;
        drawtext += ':box=1:boxcolor=black@0.45:boxborderw=8';
        filters.push(drawtext);
    }

    const filterChain = `${filters.join(',')},split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=sierra2_4a`;

    const args = ['-hide_banner', '-y'];
    const startSec = Math.max(0, parseFloat(start) || 0);
    if (startSec > 0) args.push('-ss', String(startSec));
    args.push('-i', file);

    const dur = Math.max(0, parseFloat(duration) || 0);
    if (dur > 0) args.push('-t', String(dur));

    args.push('-vf', filterChain);
    args.push('-loop', String(loop));
    const gifName = `animated_${new Date().toISOString().replace(/[:.]/g, '-')}.gif`;
    args.push(uniqueOutputPath(path.join(resolveOutputDir(file), gifName)));

    const outPath = args[args.length - 1];
    const proc = spawn('ffmpeg', args);
    gifProcess = proc;

    let stderr = '';
    let lastPercent = 0;

    proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (stderr.length > 20000) stderr = stderr.slice(-20000);

        if (dur > 0) {
            const matches = [...stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
            if (matches.length) {
                const m = matches[matches.length - 1];
                const elapsed = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
                const percent = Math.max(0, Math.min(99, Math.round((elapsed / dur) * 100)));
                if (percent > lastPercent) {
                    lastPercent = percent;
                    event.reply('gif-progress', { percent });
                }
            }
        }
    });

    proc.on('error', (err) => {
        gifProcess = null;
        event.reply('gif-result', { success: false, error: err.message });
    });

    proc.on('close', (code) => {
        gifProcess = null;
        if (code === 0 && fs.existsSync(outPath)) {
            event.reply('gif-result', { success: true, path: outPath });
        } else if (code === null) {
            event.reply('gif-result', { success: false, error: 'Cancelled' });
        } else {
            const lines = stderr.trim().split(/\r?\n/).filter(l => l.trim());
            event.reply('gif-result', { success: false, error: lines.length ? lines[lines.length - 1] : 'ffmpeg failed' });
        }
    });
});

ipcMain.on('gif-cancel', () => {
    if (gifProcess) {
        gifProcess.kill();
        gifProcess = null;
    }
});
