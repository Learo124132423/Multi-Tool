# Multi-Tool

A multi-purpose Windows desktop app built with Electron. Everything runs locally on your machine.

## Download

Grab the latest release from GitHub:

**[Download the latest version](https://github.com/Learo124132423/Multi-Tool/releases/latest)**

Two builds are attached to every release:

| File | What it is |
| --- | --- |
| `Multi-Tool Setup <version>.exe` | Installer (recommended). Installs to a folder and adds a desktop shortcut. |
| `Multi-Tool <version>.exe` | Portable. Runs straight from the file, no installation. |

### "Windows protected your PC" warning

The app is not code-signed yet, so Windows SmartScreen shows a warning on first launch. Click
**More info → Run anyway**. To remove the warning entirely you need a Windows code-signing
certificate and the `certificateFile` setting in `package.json`.

### Automatic updates

Installed copies check for updates on startup and notify you when a new version is available.
You can also trigger a check from **Settings → Updates**. Updates are downloaded in the
background and installed the next time you close the app.

## Tools

- **Downloader** — download video/audio from links with yt-dlp
- **Calculator** — scientific calculator with history
- **QR Code** — generate and save QR codes
- **Unit & Currency** — unit conversion and live exchange rates
- **Media Converter** — convert images, audio and video
- **Picture Editor** — reduce image quality and remove backgrounds (remove.bg)
- **Color Tools** — picker, palettes and contrast checks
- **Thumbnail Grabber** — fetch thumbnails from a video link
- **OCR** — extract text from images
- **PDF Toolkit** — merge, split, rotate, compress, convert
- **GIF Creator** — build an animated GIF from images
- **Settings** — download folder, API keys, updates

## Setup

### Background removal (remove.bg)

Background removal uses the [remove.bg](https://www.remove.bg/api) API, which needs your own
API key. Get a free key at <https://www.remove.bg/api>, then paste it into
**Settings → Background removal → remove.bg key** and press **Save settings**.

The key is stored only on your own machine, in
`%APPDATA%\Multi-Tool\settings.json`.

## Build from source

```bash
npm install
npm run setup      # downloads yt-dlp and the OCR language data
npm start          # run the app in development
```

Create an installer:

```bash
npm run dist       # output lands in dist/
```

## Publish a release

1. Bump the version in `package.json`.
2. Commit and tag the release:

   ```bash
   git tag v1.1.0
   git push origin main --tags
   ```

3. The `Release` GitHub Actions workflow builds the app and publishes the installers plus the
   `latest.yml` update manifest to the GitHub release automatically.

To publish from your own machine instead:

```bash
npm run release
```

(`gh auth login` or a `GH_TOKEN` environment variable is required for GitHub publishing.)

## Project layout

```
main.js              Electron main process: IPC, file handling, updater
preload.js           Context-isolated bridge between main and renderer
src/index.html       App markup
src/js/app.js        Navigation, settings, shared UI helpers
src/js/tools/        One module per tool
src/styles/base.css  Theme and layout
scripts/setup.js     Downloads yt-dlp and OCR language data
```
