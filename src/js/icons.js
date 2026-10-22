const ICONS = {
    downloader: {
        color: '#3d8bff',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a1 1 0 0 1 1 1v9.586l2.293-2.293a1 1 0 0 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L11 13.586V4a1 1 0 0 1 1-1z"/><path d="M4 16a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2a1 1 0 1 1 2 0v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2a1 1 0 0 1 1-1z"/></svg>'
    },
    calculator: {
        color: '#34c759',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M7 2h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zM8 5h8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM6.8 13a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0zM10.8 13a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0zM14.8 13a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0zM6.8 17.5a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0zM10.8 17.5a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0zM14.8 17.5a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0z"/></svg>'
    },
    qr: {
        color: '#a855f7',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M3 3h7v7H3V3zM5 5h3v3H5V5zM14 3h7v7h-7V3zM16 5h3v3h-3V5zM3 14h7v7H3v-7zM5 16h3v3H5v-3zM10.5 10.5h3v3h-3v-3zM14 14h3v3h-3v-3z"/></svg>'
    },
    converter: {
        color: '#10b981',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.414 3.5H16a2 2 0 0 1 2 2v7a1 1 0 1 1-2 0v-7H6.414l1.543 1.543A1 1 0 1 1 6.543 8.958L2.732 5.146 6.543 1.335a1 1 0 0 1 1.414 1.414L6.414 3.5zM17.586 20.5H8a2 2 0 0 1-2-2v-7a1 1 0 1 1 2 0v7h9.586l-1.543-1.543a1 1 0 0 1 1.414-1.414l3.811 3.811-3.811 3.811a1 1 0 0 1-1.414-1.414L17.586 20.5z"/></svg>'
    },
    image: {
        color: '#ff5fa2',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm3.5 4A2.5 2.5 0 1 0 11 9.5 2.5 2.5 0 0 0 8.5 7zM4 18.086L8.586 13.5l3 3 4-4L20 17v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-.086z"/></svg>'
    },
    editor: {
        color: '#f97316',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h10a2 2 0 0 1 2 2v7.5l-2 2V6H4v12h6.5l2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-4 9.5L7.5 13l2.6 2.6 1.4-1.4V18H4v-1.5z"/><path d="M19.7 12.3a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-.5.26l-2.2.55a.75.75 0 0 1-.9-.9l.55-2.2a1 1 0 0 1 .26-.5l5-5a1 1 0 0 1 1.4 0l1.4 1.4z"/></svg>'
    },
    file: {
        color: '#00c2c7',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h8l6 6v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm7 1.5V8h4.5L13 3.5z"/><path d="M7.5 11.5h9v2h-9v-2zm0 4h9v2h-9v-2z"/></svg>'
    },
    color: {
        color: '#ffd60a',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4-.4-.4-.6-.9-.6-1.4 0-1.1.9-2 2-2h1.4A4.8 4.8 0 0 0 21 9.4C21 5.8 16.9 3 12 3zM6.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm3-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm2.5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>'
    },
    brand: {
        color: '#3d8bff',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 2.5a5 5 0 0 0-4.77 3.58l-6.96 6.96a3 3 0 1 0 4.24 4.24l6.96-6.96A5 5 0 1 0 18.5 2.5zM4.1 17.9a1.5 1.5 0 1 1 2.12 2.12l-1.41 1.42a1.5 1.5 0 1 1-2.12-2.12l1.41-1.42z"/></svg>'
    },
    back: {
        color: '#a0a0a0',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.7 4.3a1 1 0 0 1 0 1.4L8.42 12l6.3 6.3a1 1 0 0 1-1.42 1.4l-7-7a1 1 0 0 1 0-1.4l7-7a1 1 0 0 1 1.41 0z"/></svg>'
    },
    thumbnail: {
        color: '#ffb020',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h14V5H5zm9 8H8v-4h6v4zm0-6H8V7h6v4zM8 15h6v-4H8v4z"/></svg>'
    },
    currency: {
        color: '#10b981',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>'
    },
    ocr: {
        color: '#06b6d4',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h6v2H5v4H3V3zM21 3v6h-2V5h-4V3h6zM3 21v-6h2v4h4v2H3zM21 21h-6v-2h4v-4h2v6zM7 10h10v2H7v-2zM7 14h10v2H7v-2zM7 6h4v2H7V6zM13 6h4v2h-4V6z"/></svg>'
    },
    pdf: {
        color: '#ef4444',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M6 2h7l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM13 2l6 6h-6V2zM8 11h8v2H8v-2zM8 15h8v2H8v-2z"/></svg>'
    },
    gif: {
        color: '#d946ef',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M5 4h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM10 8.5v7l6-3.5-6-3.5z"/></svg>'
    },
    settings: {
        color: '#8b8f98',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>'
    }
};

function renderIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
        const key = el.dataset.icon;
        const icon = ICONS[key];
        if (!icon) return;
        el.innerHTML = icon.svg;
        el.style.color = icon.color;
        // Expose the icon's color to the parent card so hover can use it
        const card = el.closest('.tool-card');
        if (card) card.style.setProperty('--icon-color', icon.color);
    });
}