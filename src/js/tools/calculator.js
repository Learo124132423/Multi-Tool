const CalculatorTool = {
    initialized: false,
    angleMode: 'rad',
    memory: 0,
    ans: '',
    history: [],
    second: false,
    justEvaluated: false,
    lastPreviewValue: null,
    previewReqId: null,
    reqCounter: 0,
    previewTimer: null,
    display: null,
    previewEl: null,

    basicKeys: [
        { label: 'AC', action: 'clear', cls: 'calc-key--fn' },
        { label: '←', action: 'backspace', cls: 'calc-key--fn' },
        { label: '%', insert: '%', cls: 'calc-key--fn' },
        { label: '÷', insert: '/', cls: 'calc-key--op' },
        { label: '7', insert: '7' },
        { label: '8', insert: '8' },
        { label: '9', insert: '9' },
        { label: '×', insert: '*', cls: 'calc-key--op' },
        { label: '4', insert: '4' },
        { label: '5', insert: '5' },
        { label: '6', insert: '6' },
        { label: '−', insert: '-', cls: 'calc-key--op' },
        { label: '1', insert: '1' },
        { label: '2', insert: '2' },
        { label: '3', insert: '3' },
        { label: '+', insert: '+', cls: 'calc-key--op' },
        { label: '±', action: 'negate', cls: 'calc-key--fn' },
        { label: '0', insert: '0' },
        { label: '.', insert: '.' },
        { label: '=', action: 'evaluate', cls: 'calc-key--eq' }
    ],

    getSciKeys() {
        if (this.second) {
            return [
                { label: '2nd', action: 'toggleSecond', cls: 'calc-key--fn active' },
                { label: 'sin⁻¹', insert: 'asin(' },
                { label: 'cos⁻¹', insert: 'acos(' },
                { label: 'tan⁻¹', insert: 'atan(' },
                { label: '∛', insert: 'cbrt(' },
                { label: 'x³', insert: '^3' },
                { label: 'xʸ', insert: '^' },
                { label: 'π', insert: 'pi' },
                { label: 'ln', insert: 'log(' },
                { label: 'log', insert: 'log10(' },
                { label: 'e', insert: 'e' },
                { label: '!', insert: '!' },
                { label: '(', insert: '(' },
                { label: ')', insert: ')' },
                { label: '1/x', insert: '1/(' },
                { label: 'Ans', insert: 'Ans' }
            ];
        }

        return [
            { label: '2nd', action: 'toggleSecond', cls: 'calc-key--fn' },
            { label: 'sin', insert: 'sin(' },
            { label: 'cos', insert: 'cos(' },
            { label: 'tan', insert: 'tan(' },
            { label: '√', insert: 'sqrt(' },
            { label: 'x²', insert: '^2' },
            { label: 'xʸ', insert: '^' },
            { label: 'π', insert: 'pi' },
            { label: 'ln', insert: 'log(' },
            { label: 'log', insert: 'log10(' },
            { label: 'e', insert: 'e' },
            { label: '!', insert: '!' },
            { label: '(', insert: '(' },
            { label: ')', insert: ')' },
            { label: '1/x', insert: '1/(' },
            { label: 'Ans', insert: 'Ans' }
        ];
    },

    init() {
        if (this.initialized) return;

        this.display = document.getElementById('calc-display');
        this.previewEl = document.getElementById('calc-preview');

        this.loadState();
        this.buildKeypad();
        this.buildSciGrid();
        this.bindEvents();
        this.updateAngleButton();
        this.updateMemoryIndicator();
        this.renderHistory();

        window.api.receive('calculation-result', (data) => this.onResult(data));

        this.initialized = true;
    },

    buildKeypad() {
        const grid = document.getElementById('calc-keypad');
        grid.innerHTML = '';

        this.basicKeys.forEach(key => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'calc-key' + (key.cls ? ' ' + key.cls : '');
            btn.textContent = key.label;
            btn.addEventListener('click', () => this.pressKey(key));
            grid.appendChild(btn);
        });
    },

    buildSciGrid() {
        const grid = document.getElementById('calc-sci-grid');
        grid.innerHTML = '';

        this.getSciKeys().forEach(key => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'calc-key' + (key.cls ? ' ' + key.cls : '');
            btn.textContent = key.label;
            btn.addEventListener('click', () => this.pressKey(key));
            grid.appendChild(btn);
        });
    },

    bindEvents() {
        this.display.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.evaluate();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.clear();
            }
        });

        this.display.addEventListener('input', () => {
            this.justEvaluated = false;
            this.schedulePreview();
        });

        document.querySelectorAll('[data-calc-memory]').forEach(btn => {
            btn.addEventListener('click', () => this.handleMemory(btn.dataset.calcMemory));
        });

        document.getElementById('calc-angle').addEventListener('click', () => this.toggleAngle());

        document.getElementById('calc-sci-toggle').addEventListener('click', () => {
            const panel = document.getElementById('calc-sci-panel');
            panel.classList.toggle('open');
            document.getElementById('calc-sci-toggle').classList.toggle('active', panel.classList.contains('open'));
            this.display.focus();
        });

        document.getElementById('calc-history-toggle').addEventListener('click', () => {
            const panel = document.getElementById('calc-history');
            panel.classList.toggle('open');
            document.getElementById('calc-history-toggle').classList.toggle('active', panel.classList.contains('open'));
        });

        document.getElementById('calc-history-clear').addEventListener('click', () => {
            this.history = [];
            this.saveState();
            this.renderHistory();
        });

        document.getElementById('calc-copy').addEventListener('click', () => {
            const text = this.display.value.trim();
            if (!text) return app.showToast('Nothing to copy', 'danger');
            navigator.clipboard.writeText(text);
            app.showToast('Copied: ' + text, 'success');
        });
    },

    pressKey(key) {
        if (key.action === 'toggleSecond') {
            this.second = !this.second;
            this.buildSciGrid();
            this.display.focus();
            return;
        }

        if (key.action === 'evaluate') {
            this.evaluate();
        } else if (key.action === 'clear') {
            this.clear();
        } else if (key.action === 'backspace') {
            this.backspace();
        } else if (key.action === 'negate') {
            this.negate();
        } else if (key.insert) {
            this.insert(key.insert);
        }
    },

    insert(text) {
        let value = this.display.value;

        if (this.justEvaluated) {
            if (/^[0-9.]/.test(text)) value = '';
            this.justEvaluated = false;
        }

        if (['+', '-', '*', '/', '^'].includes(text)) {
            if (!value) {
                if (text === '-') value = '-';
            } else if (/[+\-*/^]$/.test(value)) {
                value = value.slice(0, -1) + text;
            } else {
                value += text;
            }
        } else if (text === '.') {
            const currentNumber = value.split(/[^0-9.]/).pop();
            if (!currentNumber.includes('.')) value += '.';
        } else if (text === '%') {
            if (value) value += '%';
        } else {
            value += text;
        }

        this.display.value = value;
        this.lastPreviewValue = null;
        this.schedulePreview();
        this.display.focus();
    },

    backspace() {
        this.display.value = this.display.value.slice(0, -1);
        this.justEvaluated = false;
        this.lastPreviewValue = null;
        this.schedulePreview();
        this.display.focus();
    },

    clear() {
        this.display.value = '';
        this.previewEl.textContent = '';
        this.lastPreviewValue = null;
        this.previewReqId = null;
        this.justEvaluated = false;
        this.display.focus();
    },

    negate() {
        const value = this.display.value;

        if (!value) {
            this.display.value = '-';
        } else {
            const match = value.match(/(^|[+\-*/^(])(-?)(\d*\.?\d+)$/);
            if (!match) {
                this.display.value = value.startsWith('-') ? value.slice(1) : '-' + value;
            } else {
                const numStart = value.length - match[3].length;
                if (match[2] === '-') {
                    this.display.value = value.slice(0, numStart - 1) + match[3];
                } else {
                    this.display.value = value.slice(0, numStart) + '-' + match[3];
                }
            }
        }

        this.justEvaluated = false;
        this.schedulePreview();
        this.display.focus();
    },

    toggleAngle() {
        this.angleMode = this.angleMode === 'deg' ? 'rad' : 'deg';
        this.saveState();
        this.updateAngleButton();
        this.schedulePreview();
        this.display.focus();
    },

    updateAngleButton() {
        const btn = document.getElementById('calc-angle');
        btn.textContent = this.angleMode === 'deg' ? 'DEG' : 'RAD';
        btn.classList.toggle('active', this.angleMode === 'deg');
    },

    schedulePreview() {
        clearTimeout(this.previewTimer);
        this.previewTimer = setTimeout(() => this.requestPreview(), 90);
    },

    requestPreview() {
        const raw = this.display.value.trim();

        if (!raw) {
            this.previewEl.textContent = '';
            this.lastPreviewValue = null;
            this.previewReqId = null;
            return;
        }

        const reqId = ++this.reqCounter;
        this.previewReqId = reqId;

        window.api.send('calculate', {
            expression: this.prepareExpression(raw),
            angleMode: this.angleMode,
            preview: true,
            reqId
        });
    },

    evaluate() {
        const raw = this.display.value.trim();
        if (!raw) return;

        window.api.send('calculate', {
            expression: this.prepareExpression(raw),
            angleMode: this.angleMode,
            preview: false,
            reqId: ++this.reqCounter
        });
    },

    onResult(data) {
        if (data.preview) {
            if (this.previewReqId === null || data.reqId !== this.previewReqId) return;

            if (data.error) {
                this.previewEl.textContent = '';
                this.lastPreviewValue = null;
            } else {
                this.previewEl.textContent = '= ' + data.result;
                this.lastPreviewValue = data.result;
            }
            return;
        }

        this.previewReqId = null;

        if (data.error) {
            app.showToast(this.cleanError(data.error), 'danger');
            return;
        }

        const expression = this.display.value.trim();
        this.display.value = data.result;
        this.previewEl.textContent = '';
        this.lastPreviewValue = data.result;
        this.ans = data.result;
        this.justEvaluated = true;

        this.addHistory(expression, data.result);
        this.display.focus();
    },

    prepareExpression(raw) {
        let expr = raw
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/[−–]/g, '-')
            .replace(/π/g, 'pi');

        if (this.ans) {
            expr = expr.replace(/\bans\b/gi, `(${this.ans})`);
        }

        return this.applyPercent(expr);
    },

    applyPercent(expr) {
        const match = expr.match(/^(.*?)([+\-*/])\s*(\d+(?:\.\d+)?)\s*%$/);

        if (match && match[1].trim()) {
            const lhs = match[1].trim();
            const op = match[2];
            const rhs = match[3];

            if (op === '+' || op === '-') {
                return `${lhs}${op}(${lhs})*${rhs}/100`;
            }
            return `${lhs}${op}(${rhs}/100)`;
        }

        return expr.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
    },

    handleMemory(action) {
        if (action === 'mc') {
            this.memory = 0;
        } else if (action === 'mr') {
            const value = String(this.memory);
            if (this.justEvaluated || !this.display.value) {
                this.display.value = value;
                this.justEvaluated = false;
            } else {
                this.display.value += value;
            }
            this.lastPreviewValue = null;
            this.schedulePreview();
        } else if (action === 'mplus' || action === 'mminus') {
            const value = this.currentValue();
            if (!isFinite(value)) {
                app.showToast('Enter a valid number first', 'danger');
                return;
            }
            this.memory += action === 'mplus' ? value : -value;
        }

        this.saveState();
        this.updateMemoryIndicator();
        this.display.focus();
    },

    currentValue() {
        if (this.lastPreviewValue !== null && this.lastPreviewValue !== '') {
            const preview = Number(String(this.lastPreviewValue).replace(/[,\s]/g, ''));
            if (isFinite(preview)) return preview;
        }

        const value = Number(this.display.value);
        return isFinite(value) ? value : NaN;
    },

    updateMemoryIndicator() {
        const indicator = document.getElementById('calc-memory-indicator');
        indicator.classList.toggle('active', this.memory !== 0);
    },

    addHistory(expression, result) {
        this.history.unshift({ expr: expression, result: result });
        if (this.history.length > 50) this.history.length = 50;
        this.saveState();
        this.renderHistory();
    },

    renderHistory() {
        const list = document.getElementById('calc-history-list');
        list.innerHTML = '';

        if (!this.history.length) {
            const empty = document.createElement('div');
            empty.className = 'calc-history-empty';
            empty.textContent = 'No calculations yet';
            list.appendChild(empty);
            return;
        }

        this.history.forEach(entry => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'calc-history-item';

            const expr = document.createElement('span');
            expr.className = 'calc-history-expr';
            expr.textContent = entry.expr;

            const result = document.createElement('span');
            result.className = 'calc-history-result';
            result.textContent = '= ' + entry.result;

            item.append(expr, result);
            item.addEventListener('click', () => {
                this.display.value = entry.expr;
                this.justEvaluated = false;
                this.lastPreviewValue = null;
                this.schedulePreview();
                this.display.focus();
            });

            list.appendChild(item);
        });
    },

    cleanError(message) {
        if (!message) return 'Invalid expression';
        return String(message).replace(/^Error:\s*/, '').slice(0, 140);
    },

    loadState() {
        try {
            this.angleMode = localStorage.getItem('calc_angle') === 'deg' ? 'deg' : 'rad';

            const memory = parseFloat(localStorage.getItem('calc_memory'));
            this.memory = isFinite(memory) ? memory : 0;

            this.ans = localStorage.getItem('calc_ans') || '';

            const history = JSON.parse(localStorage.getItem('calc_history') || '[]');
            if (Array.isArray(history)) {
                this.history = history.filter(h => h && h.expr && typeof h.result === 'string').slice(0, 50);
            }
        } catch (e) {
            this.history = [];
        }
    },

    saveState() {
        try {
            localStorage.setItem('calc_angle', this.angleMode);
            localStorage.setItem('calc_memory', String(this.memory));
            localStorage.setItem('calc_ans', this.ans || '');
            localStorage.setItem('calc_history', JSON.stringify(this.history));
        } catch (e) {
            /* ignore storage failures */
        }
    }
};

window.CalculatorTool = CalculatorTool;
