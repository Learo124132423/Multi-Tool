const UNITS = {
    length: {
        from: 'meter',
        to: 'foot',
        units: {
            meter: { label: 'Meters', symbol: 'm', factor: 1 },
            kilometer: { label: 'Kilometers', symbol: 'km', factor: 1000 },
            centimeter: { label: 'Centimeters', symbol: 'cm', factor: 0.01 },
            millimeter: { label: 'Millimeters', symbol: 'mm', factor: 0.001 },
            mile: { label: 'Miles', symbol: 'mi', factor: 1609.344 },
            yard: { label: 'Yards', symbol: 'yd', factor: 0.9144 },
            foot: { label: 'Feet', symbol: 'ft', factor: 0.3048 },
            inch: { label: 'Inches', symbol: 'in', factor: 0.0254 }
        }
    },
    weight: {
        from: 'kilogram',
        to: 'pound',
        units: {
            kilogram: { label: 'Kilograms', symbol: 'kg', factor: 1 },
            gram: { label: 'Grams', symbol: 'g', factor: 0.001 },
            milligram: { label: 'Milligrams', symbol: 'mg', factor: 0.000001 },
            pound: { label: 'Pounds', symbol: 'lb', factor: 0.45359237 },
            ounce: { label: 'Ounces', symbol: 'oz', factor: 0.028349523125 },
            stone: { label: 'Stone', symbol: 'st', factor: 6.35029318 }
        }
    },
    temperature: {
        from: 'celsius',
        to: 'fahrenheit',
        units: {
            celsius: { label: 'Celsius', symbol: '°C' },
            fahrenheit: { label: 'Fahrenheit', symbol: '°F' },
            kelvin: { label: 'Kelvin', symbol: 'K' }
        }
    }
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class ComboSelect {
    constructor(rootId, onChange) {
        this.root = document.getElementById(rootId);
        this.input = this.root.querySelector('.combo-input');
        this.toggle = this.root.querySelector('.combo-toggle');
        this.list = this.root.querySelector('.combo-list');
        this.onChange = onChange;
        this.items = [];
        this.filtered = [];
        this.value = '';
        this.activeIndex = -1;

        this.input.addEventListener('focus', () => {
            this.open();
            this.render('');
            this.input.select();
        });

        this.input.addEventListener('input', () => {
            this.open();
            this.render(this.input.value);
        });

        this.input.addEventListener('keydown', (event) => this.onKeyDown(event));

        this.input.addEventListener('blur', () => {
            setTimeout(() => {
                if (!this.root.contains(document.activeElement)) {
                    this.close();
                    this.restoreLabel();
                }
            }, 100);
        });

        this.toggle.addEventListener('mousedown', (event) => event.preventDefault());
        this.toggle.addEventListener('click', () => {
            if (this.isOpen()) {
                this.close();
                this.restoreLabel();
            } else {
                this.input.focus();
                this.open();
                this.render('');
                this.input.select();
            }
        });

        this.list.addEventListener('mousedown', (event) => event.preventDefault());
        this.list.addEventListener('click', (event) => {
            const item = event.target.closest('.combo-item');
            if (item) this.select(item.dataset.value);
        });

        document.addEventListener('mousedown', (event) => {
            if (!this.root.contains(event.target)) {
                this.close();
                this.restoreLabel();
            }
        });
    }

    setItems(items, value) {
        this.items = items;
        const next = items.some(item => item.value === value)
            ? value
            : (items[0] ? items[0].value : '');
        this.setValue(next, false);
    }

    setValue(value, notify = true) {
        this.value = value;
        this.input.value = this.labelFor(value);
        this.close();
        if (notify && this.onChange) this.onChange(value);
    }

    getValue() {
        return this.value;
    }

    labelFor(value) {
        const item = this.items.find(entry => entry.value === value);
        return item ? item.label : '';
    }

    isOpen() {
        return this.list.classList.contains('open');
    }

    open() {
        this.list.classList.add('open');
        this.input.setAttribute('aria-expanded', 'true');
    }

    close() {
        this.list.classList.remove('open');
        this.input.setAttribute('aria-expanded', 'false');
        this.activeIndex = -1;
    }

    restoreLabel() {
        this.input.value = this.labelFor(this.value);
    }

    render(query) {
        const needle = String(query || '').trim().toLowerCase();
        this.filtered = this.items.filter(item => {
            if (!needle) return true;
            return item.search.toLowerCase().includes(needle) || item.label.toLowerCase().includes(needle);
        });

        if (this.filtered.length === 0) {
            this.list.innerHTML = '<div class="combo-empty">No matches</div>';
            this.activeIndex = -1;
            return;
        }

        this.list.innerHTML = this.filtered.map((item, index) => {
            const selected = item.value === this.value ? ' selected' : '';
            const active = index === this.activeIndex ? ' active' : '';
            return `<div class="combo-item${selected}${active}" data-value="${escapeHtml(item.value)}" role="option">${escapeHtml(item.label)}</div>`;
        }).join('');
    }

    onKeyDown(event) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!this.isOpen()) {
                this.open();
                this.render('');
            }
            this.activeIndex = Math.min(this.activeIndex + 1, this.filtered.length - 1);
            this.highlight();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!this.isOpen()) {
                this.open();
                this.render('');
            }
            this.activeIndex = Math.max(this.activeIndex - 1, 0);
            this.highlight();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (this.activeIndex >= 0 && this.filtered[this.activeIndex]) {
                this.select(this.filtered[this.activeIndex].value);
                return;
            }
            const typed = this.input.value.trim().toLowerCase();
            const exact = this.filtered.find(item =>
                item.value.toLowerCase() === typed || item.label.toLowerCase() === typed
            );
            if (exact) {
                this.select(exact.value);
            } else {
                this.close();
                this.restoreLabel();
                this.input.blur();
            }
        } else if (event.key === 'Escape') {
            this.close();
            this.restoreLabel();
            this.input.blur();
        }
    }

    highlight() {
        this.list.querySelectorAll('.combo-item').forEach((item, index) => {
            item.classList.toggle('active', index === this.activeIndex);
        });
        const active = this.list.querySelectorAll('.combo-item')[this.activeIndex];
        if (active) active.scrollIntoView({ block: 'nearest' });
    }

    select(value) {
        this.setValue(value, true);
        this.input.blur();
    }
}

const ConverterTool = {
    rates: null,
    lastUpdated: null,
    baseCurrency: 'USD',
    category: 'length',
    cacheKey: 'currency_rates_cache',
    initialized: false,
    loadingRates: false,
    rateTimeout: null,
    fromCombo: null,
    toCombo: null,
    currencyNames: null,

    init() {
        if (this.initialized) return;
        this.loadCache();
        this.fromCombo = new ComboSelect('conv-from-combo', () => this.convert());
        this.toCombo = new ComboSelect('conv-to-combo', () => this.convert());
        this.setupEventListeners();
        this.setCategory('length');
        this.initialized = true;
    },

    setupEventListeners() {
        document.getElementById('conv-category').addEventListener('change', (e) => {
            this.setCategory(e.target.value);
        });

        document.getElementById('conv-amount').addEventListener('input', () => this.convert());
        document.getElementById('conv-btn').addEventListener('click', () => this.convert());
        document.getElementById('conv-swap-btn').addEventListener('click', () => this.swap());
        document.getElementById('conv-refresh-btn').addEventListener('click', () => this.fetchRates(true));
    },

    loadCache() {
        const cached = localStorage.getItem(this.cacheKey);
        if (!cached) return;

        try {
            const data = JSON.parse(cached);
            this.rates = data.rates;
            this.lastUpdated = data.timestamp;
            this.baseCurrency = data.base || 'USD';
        } catch (e) {
            console.warn('Failed to parse currency cache:', e);
        }
    },

    saveCache() {
        if (!this.rates) return;
        localStorage.setItem(this.cacheKey, JSON.stringify({
            rates: this.rates,
            timestamp: this.lastUpdated,
            base: this.baseCurrency
        }));
    },

    setCategory(category) {
        if (category !== 'currency' && !UNITS[category]) return;

        this.category = category;
        document.getElementById('conv-category').value = category;

        const refreshBtn = document.getElementById('conv-refresh-btn');
        refreshBtn.style.display = category === 'currency' ? 'inline-block' : 'none';

        if (category === 'currency') {
            this.populateCurrencyOptions(false);
            if (!this.rates || !this.lastUpdated || Date.now() - this.lastUpdated > 60 * 60 * 1000) {
                this.fetchRates(false);
            }
        } else {
            this.populateUnitOptions();
        }

        this.updateStatus();
        this.convert();
    },

    populateUnitOptions() {
        const def = UNITS[this.category];
        const items = Object.entries(def.units).map(([value, unit]) => ({
            value,
            label: `${unit.label} (${unit.symbol})`,
            search: `${unit.label} ${unit.symbol}`
        }));

        this.fromCombo.setItems(items, def.from);
        this.toCombo.setItems(items, def.to);
    },

    populateCurrencyOptions(preserve) {
        const currencies = Object.keys(this.rates || this.getDefaultRates()).sort();
        const items = currencies.map(code => {
            const name = this.getCurrencyName(code);
            return {
                value: code,
                label: `${code} — ${name}`,
                search: `${code} ${name}`
            };
        });

        const previousFrom = preserve ? this.fromCombo.getValue() : 'USD';
        const previousTo = preserve ? this.toCombo.getValue() : 'EUR';
        const fromValue = currencies.includes(previousFrom) ? previousFrom : 'USD';
        const toValue = currencies.includes(previousTo) && previousTo !== fromValue
            ? previousTo
            : (currencies.find(code => code !== fromValue) || fromValue);

        this.fromCombo.setItems(items, fromValue);
        this.toCombo.setItems(items, toValue);
    },

    getCurrencyName(code) {
        try {
            if (!this.currencyNames) {
                this.currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });
            }
            return this.currencyNames.of(code) || code;
        } catch (e) {
            return code;
        }
    },

    swap() {
        const from = this.fromCombo.getValue();
        const to = this.toCombo.getValue();
        this.fromCombo.setValue(to, false);
        this.toCombo.setValue(from, false);
        this.convert();
    },

    convert() {
        const amountEl = document.getElementById('conv-amount');
        const resultEl = document.getElementById('conv-result');
        const amount = parseFloat(amountEl.value);

        if (!Number.isFinite(amount)) {
            resultEl.textContent = 'Enter a valid amount';
            return;
        }

        const from = this.fromCombo.getValue();
        const to = this.toCombo.getValue();
        let result;
        let fromSymbol;
        let toSymbol;

        if (this.category === 'currency') {
            const rates = this.rates || this.getDefaultRates();
            const fromRate = rates[from];
            const toRate = rates[to];

            if (!fromRate || !toRate) {
                resultEl.textContent = 'Rates unavailable';
                return;
            }

            result = amount * (toRate / fromRate);
            fromSymbol = from;
            toSymbol = to;
        } else {
            const units = UNITS[this.category].units;
            const fromUnit = units[from];
            const toUnit = units[to];

            if (!fromUnit || !toUnit) {
                resultEl.textContent = 'Select two units';
                return;
            }

            if (this.category === 'temperature') {
                result = this.convertTemperature(amount, from, to);
            } else {
                result = amount * fromUnit.factor / toUnit.factor;
            }

            fromSymbol = fromUnit.symbol;
            toSymbol = toUnit.symbol;
        }

        resultEl.textContent = `${this.formatNumber(amount)} ${fromSymbol} = ${this.formatNumber(result)} ${toSymbol}`;
    },

    convertTemperature(value, from, to) {
        let celsius;
        if (from === 'celsius') celsius = value;
        else if (from === 'fahrenheit') celsius = (value - 32) * 5 / 9;
        else celsius = value - 273.15;

        if (to === 'celsius') return celsius;
        if (to === 'fahrenheit') return celsius * 9 / 5 + 32;
        return celsius + 273.15;
    },

    formatNumber(value) {
        const abs = Math.abs(value);
        const maximumFractionDigits = abs > 0 && abs < 0.001 ? 10 : 6;
        return value.toLocaleString(undefined, { maximumFractionDigits });
    },

    getDefaultRates() {
        return {
            USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150, CAD: 1.35,
            AUD: 1.52, CHF: 0.90, CNY: 7.24, INR: 83.12, MXN: 17.05
        };
    },

    fetchRates(force) {
        if (this.loadingRates) return;
        if (!force && this.rates && this.lastUpdated && Date.now() - this.lastUpdated < 60 * 60 * 1000) {
            this.updateStatus();
            return;
        }

        this.loadingRates = true;
        const refreshBtn = document.getElementById('conv-refresh-btn');
        refreshBtn.disabled = true;
        refreshBtn.textContent = '…';
        document.getElementById('conv-status').textContent = 'Fetching exchange rates...';

        window.api.send('get-rates', { base: 'USD' });

        clearTimeout(this.rateTimeout);
        this.rateTimeout = setTimeout(() => {
            if (!this.loadingRates) return;
            this.loadingRates = false;
            refreshBtn.disabled = false;
            refreshBtn.textContent = '↻';
            document.getElementById('conv-status').textContent = 'Could not update rates; using offline values.';
        }, 15000);
    },

    handleRates(data) {
        if (!data || !data.rates) return;

        clearTimeout(this.rateTimeout);
        this.loadingRates = false;
        this.rates = data.rates;
        this.baseCurrency = data.base || 'USD';
        this.lastUpdated = Date.now();
        this.saveCache();

        const refreshBtn = document.getElementById('conv-refresh-btn');
        refreshBtn.disabled = false;
        refreshBtn.textContent = '↻';

        if (this.category === 'currency' && this.fromCombo) {
            this.populateCurrencyOptions(true);
            this.convert();
        }
        this.updateStatus();
    },

    handleRatesError(error) {
        clearTimeout(this.rateTimeout);
        this.loadingRates = false;

        const refreshBtn = document.getElementById('conv-refresh-btn');
        refreshBtn.disabled = false;
        refreshBtn.textContent = '↻';

        if (this.category === 'currency') {
            document.getElementById('conv-status').textContent =
                'Could not update rates' + (error && error.message ? ': ' + error.message : '; using cached values.');
        }
    },

    updateStatus() {
        const status = document.getElementById('conv-status');
        if (this.category !== 'currency') {
            status.textContent = '';
            return;
        }

        if (this.lastUpdated) {
            status.textContent = 'Exchange rates from ' + new Date(this.lastUpdated).toLocaleString();
        } else {
            status.textContent = 'Using offline exchange rates.';
        }
    }
};

window.api.receive('rates-data', (data) => ConverterTool.handleRates(data));
window.api.receive('rates-error', (error) => ConverterTool.handleRatesError(error));

window.ConverterTool = ConverterTool;
