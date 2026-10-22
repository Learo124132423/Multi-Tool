const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'resources', 'bin');
const YTDLP_PATH = path.join(BIN_DIR, 'yt-dlp.exe');
const TESSDATA_DIR = path.join(__dirname, '..', 'resources', 'tessdata');
const TESSDATA_LANGS = ['eng', 'khm', 'chi_sim'];

async function downloadYtDlp() {
    console.log('Checking for yt-dlp.exe...');
    if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    try {
        const response = await axios.get('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest');
        const asset = response.data.assets.find(a => a.name === 'yt-dlp.exe');
        
        if (!asset) {
            throw new Error('Could not find yt-dlp.exe in latest release');
        }

        console.log(`Downloading yt-dlp.exe from ${asset.browser_download_url}...`);
        const writer = fs.createWriteStream(YTDLP_PATH);
        const downloadResponse = await axios({
            url: asset.browser_download_url,
            method: 'GET',
            responseType: 'stream'
        });

        downloadResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Failed to download yt-dlp:', error.message);
    }
}

async function downloadTessdata() {
    console.log('Downloading Tesseract language data...');
    if (!fs.existsSync(TESSDATA_DIR)) {
        fs.mkdirSync(TESSDATA_DIR, { recursive: true });
    }

    const baseUrl = 'https://tessdata.projectnaptha.com/4.0.0/';
    
    for (const lang of TESSDATA_LANGS) {
        const fileName = `${lang}.traineddata`;
        const filePath = path.join(TESSDATA_DIR, fileName);
        
        if (fs.existsSync(filePath)) {
            console.log(`✓ ${lang}.traineddata already exists`);
            continue;
        }

        const url = baseUrl + fileName + '.gz';
        console.log(`Downloading ${fileName}...`);
        
        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                timeout: 120000
            });

            // Decompress gzip on the fly
            const zlib = require('zlib');
            const gunzip = zlib.createGunzip();
            const writer = fs.createWriteStream(filePath);
            
            response.data.pipe(gunzip).pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`✓ ${lang}.traineddata downloaded`);
                    resolve();
                });
                writer.on('error', reject);
                gunzip.on('error', reject);
            });
        } catch (error) {
            console.error(`Failed to download ${lang}.traineddata:`, error.message);
        }
    }
}

function checkDependencies() {
    console.log('Checking dependencies...');
    
    // Check FFmpeg
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        console.log('✓ FFmpeg found');
    } catch (e) {
        console.warn('! FFmpeg not found on PATH. Downloaders might fail to merge audio/video.');
    }

    // Check Python
    try {
        execSync('python --version', { stdio: 'ignore' });
        console.log('✓ Python found');
        
        // Try install spotdl
        console.log('Installing/Updating spotdl via pip...');
        try {
            execSync('pip install spotdl', { stdio: 'inherit' });
            console.log('✓ spotdl ready');
        } catch (e) {
            console.warn('! Failed to install spotdl. Spotify downloader will not work.');
        }
    } catch (e) {
        console.warn('! Python not found. Spotify downloader will not work.');
    }
}

async function setup() {
    await downloadYtDlp();
    await downloadTessdata();
    checkDependencies();
    console.log('Setup complete!');
}

setup();
