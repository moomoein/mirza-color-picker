class MirzaColorPicker {
  constructor(options) {
    this.opts = Object.assign({
      trigger: null,
      theme: 'dark',
      layout: 'default',
      lang: 'en',
      defaultColor: '#7c5cff',
      swatches: ['#FF5C5C', '#FFBD00', '#00D1FF', '#7C5CFF', '#FFFFFF', '#000000'],
      onChange: () => {},
      onSave: () => {}
    }, options);

    this.i18n = {
      en: { title: 'Color Picker', lastUsed: 'Last Used' },
      fa: { title: 'انتخاب رنگ', lastUsed: 'رنگ‌های اخیر' }
    };

    this.state = { h: 0, s: 1, v: 1, a: 1, mode: 'hex' };
    this.dom = {};
    this.ctx = {};
    this.isOpen = false;
    this.lastUsed = [...this.opts.swatches];
    
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.init();
  }

  init() {
    this.triggerEl = document.querySelector(this.opts.trigger);
    if (!this.triggerEl) return;

    this.buildUI();
    this.bindEvents();
    this.setColor(this.opts.defaultColor);
    
    requestAnimationFrame(() => {
      const activeTab = this.dom.root.querySelector('.mcp-tab.is-active');
      this.moveGlider(activeTab);
    });
  }

  buildUI() {
    const id = `mcp-${Math.random().toString(36).substr(2, 9)}`;
    const isRTL = this.opts.lang === 'fa';
    const txt = this.i18n[this.opts.lang];

    const el = document.createElement('div');
    el.className = `mcp-wrapper mcp-layout-${this.opts.layout}`;
    el.setAttribute('data-mcp-theme', this.opts.theme);
    el.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    el.id = id;

    el.innerHTML = `
      <div class="mcp-header">
        <span class="mcp-title">${txt.title}</span>
        <button class="mcp-close">✕</button>
      </div>
      <div class="mcp-main-area">
        <div class="mcp-saturation"><canvas></canvas><div class="mcp-cursor"></div></div>
        <div class="mcp-sliders">
          <div class="mcp-slider mcp-hue"><canvas></canvas><div class="mcp-knob"></div></div>
          <div class="mcp-slider mcp-alpha"><canvas></canvas><div class="mcp-knob"></div></div>
        </div>
      </div>
      <div class="mcp-tabs">
        <div class="mcp-tab-glider"></div>
        <div class="mcp-tab is-active" data-mode="hex">HEX</div>
        <div class="mcp-tab" data-mode="rgb">RGB</div>
        <div class="mcp-tab" data-mode="hsl">HSL</div>
      </div>
      <div class="mcp-controls-row"><div class="mcp-inputs-container"></div></div>
      <div class="mcp-last-used"><span class="mcp-last-title">${txt.lastUsed}</span><div class="mcp-swatches"></div></div>
    `;

    document.body.appendChild(el);
    this.dom.root = el;
    
    const q = s => el.querySelector(s);
    this.dom.sat = q('.mcp-saturation');
    this.dom.satCanvas = q('.mcp-saturation canvas');
    this.dom.cursor = q('.mcp-cursor');
    this.dom.hue = q('.mcp-hue');
    this.dom.hueCanvas = q('.mcp-hue canvas');
    this.dom.hueKnob = q('.mcp-hue .mcp-knob');
    this.dom.alpha = q('.mcp-alpha');
    this.dom.alphaCanvas = q('.mcp-alpha canvas');
    this.dom.alphaKnob = q('.mcp-alpha .mcp-knob');
    this.dom.inputs = q('.mcp-inputs-container');
    this.dom.swatches = q('.mcp-swatches');
    this.dom.tabs = el.querySelectorAll('.mcp-tab');
    this.dom.glider = q('.mcp-tab-glider');
    this.dom.close = q('.mcp-close');

    this.ctx.sat = this.dom.satCanvas.getContext('2d');
    this.ctx.hue = this.dom.hueCanvas.getContext('2d');
    this.ctx.alpha = this.dom.alphaCanvas.getContext('2d');

    this.renderInputs();
    this.renderSwatches();
    this.drawHue();
  }

  bindEvents() {
    this.triggerEl.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
    this.dom.close.addEventListener('click', () => this.close());
    document.addEventListener('mousedown', (e) => {
      if (this.isOpen && !this.dom.root.contains(e.target) && !this.triggerEl.contains(e.target)) this.close();
    });

    this.dom.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.dom.tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        this.moveGlider(tab);
        this.state.mode = tab.dataset.mode;
        this.renderInputs();
        this.updateInputValues();
      });
    });

    this.addDrag(this.dom.sat, (x, y) => { this.state.s = x; this.state.v = 1 - y; this.updateUI(); });
    const isVertical = this.opts.layout === 'vertical';
    this.addDrag(this.dom.hue, (x, y) => { this.state.h = (isVertical ? y : x) * 360; this.updateUI(); });
    this.addDrag(this.dom.alpha, (x, y) => { this.state.a = parseFloat((isVertical ? y : x).toFixed(2)); this.updateUI(); });
  }

  moveGlider(activeTab) {
    if (!activeTab) return;
    this.dom.glider.style.width = `${activeTab.offsetWidth}px`;
    this.dom.glider.style.transform = `translateX(${activeTab.offsetLeft}px)`;
  }

  updateUI(skipInputs = false) {
    const { h, s, v, a } = this.state;
    const isVertical = this.opts.layout === 'vertical';

    this.drawSat(h);
    this.dom.cursor.style.left = `${s * 100}%`;
    this.dom.cursor.style.top = `${(1 - v) * 100}%`;
    this.dom.cursor.style.backgroundColor = this.hsvToCss(h, s, v);

    const huePos = (h / 360) * 100;
    const alphaPos = a * 100;

    if (isVertical) {
      this.dom.hueKnob.style.top = `${huePos}%`; this.dom.hueKnob.style.left = '50%';
      this.dom.alphaKnob.style.top = `${alphaPos}%`; this.dom.alphaKnob.style.left = '50%';
    } else {
      this.dom.hueKnob.style.left = `${huePos}%`; this.dom.hueKnob.style.top = '50%';
      this.dom.alphaKnob.style.left = `${alphaPos}%`; this.dom.alphaKnob.style.top = '50%';
    }
    
    this.dom.hueKnob.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
    this.drawAlpha(h, s, v);

    if (!skipInputs) this.updateInputValues();
    const rgb = this.hsvToRgb(h, s, v);
    const css = a < 1 ? `rgba(${rgb.r},${rgb.g},${rgb.b},${a})` : this.rgbToHex(rgb.r, rgb.g, rgb.b);
    this.opts.onChange(css);
  }

  renderInputs() {
    let html = '';
    const mode = this.state.mode;
    if (mode === 'hex') {
      html = `<div class="mcp-inputs"><div class="mcp-input-group"><input class="mcp-input" data-type="hex" spellcheck="false"><span class="mcp-copy-btn">COPY</span><span class="mcp-label">Hex</span></div><div class="mcp-input-group" style="flex:0.4"><input class="mcp-input" data-type="alpha" type="number" min="0" max="100"><span class="mcp-label">%</span></div></div>`;
    } else {
      const labels = mode === 'rgb' ? ['R','G','B'] : ['H','S','L'];
      html = `<div class="mcp-inputs">${labels.map(l => `<div class="mcp-input-group"><input class="mcp-input" data-type="${mode}-${l.toLowerCase()}" type="number"><span class="mcp-label">${l}</span></div>`).join('')}<div class="mcp-input-group"><input class="mcp-input" data-type="alpha" type="number" min="0" max="100"><span class="mcp-label">A</span></div></div>`;
    }
    this.dom.inputs.innerHTML = html;
    this.bindInputs();
  }

  bindInputs() {
    this.dom.inputs.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => this.handleInput(input));
      input.addEventListener('change', () => this.handleInput(input, true));
    });
    const copyBtn = this.dom.inputs.querySelector('.mcp-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => this.copyToClipboard(this.dom.inputs.querySelector('[data-type="hex"]').value, copyBtn));
  }

  updateInputValues() {
    const { h, s, v, a } = this.state;
    const rgb = this.hsvToRgb(h, s, v);
    const alphaInput = this.dom.inputs.querySelector('[data-type="alpha"]');
    if (alphaInput) alphaInput.value = Math.round(a * 100);

    if (this.state.mode === 'hex') {
      this.dom.inputs.querySelector('[data-type="hex"]').value = this.rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase();
    } else if (this.state.mode === 'rgb') {
      this.dom.inputs.querySelector('[data-type="rgb-r"]').value = rgb.r;
      this.dom.inputs.querySelector('[data-type="rgb-g"]').value = rgb.g;
      this.dom.inputs.querySelector('[data-type="rgb-b"]').value = rgb.b;
    } else {
      const hsl = this.hsvToHsl(h, s, v);
      this.dom.inputs.querySelector('[data-type="hsl-h"]').value = Math.round(hsl.h);
      this.dom.inputs.querySelector('[data-type="hsl-s"]').value = Math.round(hsl.s);
      this.dom.inputs.querySelector('[data-type="hsl-l"]').value = Math.round(hsl.l);
    }
  }

  handleInput(el) {
    const type = el.dataset.type;
    const val = el.value;
    let { h, s, v } = this.state;
    if (type === 'hex') {
      const parsed = this.parseHex(val);
      if (parsed) { this.state = { ...this.state, ...parsed }; this.updateUI(true); }
    } else if (type === 'alpha') {
      this.state.a = Math.min(100, Math.max(0, val)) / 100; this.updateUI(true);
    } else if (type.startsWith('rgb')) {
      const rgb = this.hsvToRgb(h, s, v);
      rgb[type.split('-')[1]] = parseInt(val);
      const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
      this.state = { ...this.state, ...hsv }; this.updateUI(true);
    }
  }

  renderSwatches() {
    this.dom.swatches.innerHTML = this.lastUsed.map(c => `<div class="mcp-swatch" style="background:${c}" data-color="${c}"></div>`).join('');
    this.dom.swatches.querySelectorAll('.mcp-swatch').forEach(s => s.addEventListener('click', () => this.setColor(s.dataset.color)));
  }

  drawSat(h) {
    const ctx = this.ctx.sat; const w = this.dom.sat.clientWidth; const hC = this.dom.sat.clientHeight;
    this.dom.satCanvas.width = w; this.dom.satCanvas.height = hC;
    ctx.fillStyle = `hsl(${h}, 100%, 50%)`; ctx.fillRect(0, 0, w, hC);
    const white = ctx.createLinearGradient(0, 0, w, 0); white.addColorStop(0, '#fff'); white.addColorStop(1, 'transparent'); ctx.fillStyle = white; ctx.fillRect(0, 0, w, hC);
    const black = ctx.createLinearGradient(0, 0, 0, hC); black.addColorStop(0, 'transparent'); black.addColorStop(1, '#000'); ctx.fillStyle = black; ctx.fillRect(0, 0, w, hC);
  }

  drawHue() {
    const ctx = this.ctx.hue; const w = this.dom.hue.clientWidth; const h = this.dom.hue.clientHeight;
    const isVertical = this.opts.layout === 'vertical';
    this.dom.hueCanvas.width = w; this.dom.hueCanvas.height = h;
    const grad = ctx.createLinearGradient(0, 0, isVertical ? 0 : w, isVertical ? h : 0);
    [[0,'#f00'],[0.17,'#ff0'],[0.33,'#0f0'],[0.5,'#0ff'],[0.67,'#00f'],[0.83,'#f0f'],[1,'#f00']].forEach(s => grad.addColorStop(s[0], s[1]));
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  }

  drawAlpha(h, s, v) {
    const ctx = this.ctx.alpha; const w = this.dom.alpha.clientWidth; const hC = this.dom.alpha.clientHeight;
    const isVertical = this.opts.layout === 'vertical';
    this.dom.alphaCanvas.width = w; this.dom.alphaCanvas.height = hC;
    ctx.clearRect(0,0,w,hC);
    const rgb = this.hsvToRgb(h, s, v);
    const grad = ctx.createLinearGradient(0, 0, isVertical ? 0 : w, isVertical ? hC : 0);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`); grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, hC);
  }

  addDrag(el, cb) {
    const move = (e) => { e.preventDefault(); const rect = el.getBoundingClientRect(); const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; cb(Math.max(0, Math.min(1, (cx - rect.left) / rect.width)), Math.max(0, Math.min(1, (cy - rect.top) / rect.height))); };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); };
    const down = (e) => { if (e.button === 2) return; move(e); document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', up); };
    el.addEventListener('mousedown', down); el.addEventListener('touchstart', down, { passive: false });
  }

  copyToClipboard(text, btn) {
    const success = () => { const original = btn.textContent; btn.textContent = 'OK'; setTimeout(() => btn.textContent = original, 1000); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(success); } else { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px"; document.body.appendChild(ta); ta.focus(); ta.select(); try { document.execCommand('copy'); success(); } catch (e) {} document.body.removeChild(ta); }
  }

  toggle() { this.isOpen ? this.close() : this.open(); }
  open() { this.isOpen = true; this.dom.root.classList.add('is-visible'); this.position(); this.updateUI(); const activeTab = this.dom.root.querySelector('.mcp-tab.is-active'); this.moveGlider(activeTab); window.addEventListener('scroll', this.handleScroll, { capture: true, passive: true }); window.addEventListener('resize', this.handleResize); }
  close() { this.isOpen = false; this.dom.root.classList.remove('is-visible'); window.removeEventListener('scroll', this.handleScroll, { capture: true }); window.removeEventListener('resize', this.handleResize); const rgb = this.hsvToRgb(this.state.h, this.state.s, this.state.v); const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b); if (!this.lastUsed.includes(hex)) { this.lastUsed.unshift(hex); this.lastUsed = this.lastUsed.slice(0, 6); this.renderSwatches(); } }
  handleScroll() { if (this.isOpen) this.close(); }
  handleResize() { if (this.isOpen) { this.position(); this.moveGlider(this.dom.root.querySelector('.mcp-tab.is-active')); } }
  position() { const rect = this.triggerEl.getBoundingClientRect(); const pRect = this.dom.root.getBoundingClientRect(); let top = rect.bottom + 8; let left = rect.left; if (top + pRect.height > window.innerHeight) top = rect.top - pRect.height - 8; if (left + pRect.width > window.innerWidth) left = window.innerWidth - pRect.width - 10; if (left < 10) left = 10; this.dom.root.style.top = `${top}px`; this.dom.root.style.left = `${left}px`; }
  setColor(str) { const hex = this.parseHex(str); if (hex) { this.state = { ...this.state, ...hex }; this.updateUI(); } }
  parseHex(hex) { if (!hex || !hex.startsWith('#')) return null; hex = hex.slice(1); if (hex.length === 3) hex = hex.split('').map(c=>c+c).join(''); const int = parseInt(hex, 16); const r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255; return { ...this.rgbToHsv(r,g,b), a: 1 }; }
  rgbToHex(r, g, b) { return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }
  hsvToRgb(h, s, v) { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let r=0, g=0, b=0; if (h < 60) { r=c; g=x; } else if (h < 120) { r=x; g=c; } else if (h < 180) { g=c; b=x; } else if (h < 240) { g=x; b=c; } else if (h < 300) { r=x; b=c; } else { r=c; b=x; } return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) }; }
  rgbToHsv(r, g, b) { r/=255; g/=255; b/=255; const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min, v = max, s = max===0?0:d/max; let h = 0; if (max!==min) h = max===r ? (g-b)/d + (g<b?6:0) : max===g ? (b-r)/d + 2 : (r-g)/d + 4; return { h: h*60, s, v }; }
  hsvToHsl(h, s, v) { const l = v - v*s/2, m = Math.min(l, 1-l); return { h, s: m?(v-l)/m:0, l }; }
  hsvToCss(h, s, v) { const rgb = this.hsvToRgb(h,s,v); return `rgb(${rgb.r},${rgb.g},${rgb.b})`; }
}