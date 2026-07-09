// Logica di griglia condivisa tra admin e display: costruzione dei quadranti,
// disegno delle cifre (font a 7 segmenti "scalato" su tutta la griglia) e
// gestione degli stati/animazioni (live, custom, park, wave, pinwheel, ripple).
const ClockGrid = (function () {
  // Divide `total` in `parts` interi il piu' possibile uguali (i primi ricevono il resto).
  function distribute(total, parts) {
    const base = Math.floor(total / parts);
    let rem = total - base * parts;
    const sizes = new Array(parts).fill(base);
    for (let i = 0; i < rem; i++) sizes[i] += 1;
    return sizes;
  }

  function create(container, initialCfg) {
    let clocks = [];
    let cfg = null;
    let animTimer = null;
    let animTick = 0;

    function cellIndex(r, c) { return r * cfg.cols + c; }

    function build(newCfg) {
      stopAnimation();
      cfg = { rows: newCfg.rows, cols: newCfg.cols };
      container.innerHTML = '';
      container.style.gridTemplateColumns = `repeat(${cfg.cols}, var(--clock-size))`;
      container.style.gridTemplateRows = `repeat(${cfg.rows}, var(--clock-size))`;
      clocks = [];
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = 0; c < cfg.cols; c++) {
          const clockDiv = document.createElement('div');
          clockDiv.className = 'clock';
          if (c % 2 === 1 && c < cfg.cols - 1) clockDiv.classList.add('digit-gap');
          const h1 = document.createElement('div'); h1.className = 'hand';
          const h2 = document.createElement('div'); h2.className = 'hand';
          clockDiv.appendChild(h1); clockDiv.appendChild(h2);
          container.appendChild(clockDiv);
          clocks.push({ h1, h2, cum1: 135, cum2: 135 });
        }
      }
      fitToViewport();
    }

    function setHandTarget(hand, cumProp, obj, targetDeg) {
      const current = obj[cumProp];
      const currentMod = ((current % 360) + 360) % 360;
      let delta = targetDeg - currentMod;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      obj[cumProp] = current + delta;
      hand.style.transform = `rotate(${obj[cumProp]}deg)`;
    }

    // Disegna una cifra su un blocco di `width` colonne che usa TUTTE le righe
    // della griglia: i 6 ruoli del font vengono "spalmati" su sotto-blocchi
    // proporzionali, cosi' la cifra si ingrandisce riempiendo lo spazio dato.
    function renderDigitBlock(digit, colOffset, width) {
      const colSizes = distribute(width, 2);
      const rowSizes = distribute(cfg.rows, 3);
      const colBoundary = colSizes[0];
      const rowBoundary1 = rowSizes[0];
      const rowBoundary2 = rowBoundary1 + rowSizes[1];
      for (let r = 0; r < cfg.rows; r++) {
        const band = r < rowBoundary1 ? 0 : (r < rowBoundary2 ? 1 : 2);
        for (let c = 0; c < width; c++) {
          const localCol = c < colBoundary ? 0 : 1;
          const localRole = band * 2 + localCol;
          const clk = clocks[cellIndex(r, colOffset + c)];
          if (!clk) continue;
          const [a1, a2] = ClockFont.anglesForCell(digit, localRole);
          setHandTarget(clk.h1, 'cum1', clk, a1);
          setHandTarget(clk.h2, 'cum2', clk, a2);
        }
      }
    }

    function parkColumnRange(fromCol, toCol) {
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = fromCol; c < toCol; c++) {
          const localRole = (r % 3) * 2 + (c % 2);
          const park = ClockFont.ROLES[localRole].park;
          const clk = clocks[cellIndex(r, c)];
          setHandTarget(clk.h1, 'cum1', clk, park);
          setHandTarget(clk.h2, 'cum2', clk, park);
        }
      }
    }

    // La larghezza di una cifra resta SEMPRE 2 colonne (l'unita' minima del
    // font a 7 segmenti: allargarla distorce la forma). Ogni cifra usa pero'
    // tutta l'altezza della griglia, e lo spazio orizzontale in eccesso viene
    // distribuito come spaziatura prima/tra/dopo le cifre invece di stirarle.
    const DIGIT_W = 2;
    function showNumber(str) {
      const s = String(str);
      const maxDigits = Math.max(1, Math.floor(cfg.cols / DIGIT_W));
      const n = Math.max(1, Math.min(s.length, maxDigits));
      const chars = s.slice(-n).padStart(n, ' ').split('');
      const leftover = cfg.cols - n * DIGIT_W;
      const gaps = distribute(leftover, n + 1);

      parkAll();
      let col = gaps[0];
      chars.forEach((ch, i) => {
        const d = /[0-9]/.test(ch) ? parseInt(ch, 10) : undefined;
        renderDigitBlock(d, col, DIGIT_W);
        col += DIGIT_W + gaps[i + 1];
      });
    }

    function parkAll() { parkColumnRange(0, cfg.cols); }

    function stopAnimation() { if (animTimer) { clearInterval(animTimer); animTimer = null; } }
    function runAnimation(tickFn, intervalMs) {
      stopAnimation();
      animTick = 0;
      tickFn();
      animTimer = setInterval(() => { animTick++; tickFn(); }, intervalMs);
    }

    // Onda: una linea diagonale che scorre continuamente sulla griglia.
    function startWave() {
      runAnimation(() => {
        const t = animTick * 7;
        clocks.forEach((clk, idx) => {
          const r = Math.floor(idx / cfg.cols), c = idx % cfg.cols;
          const phase = (t + c * 20 - r * 14) % 360;
          setHandTarget(clk.h1, 'cum1', clk, phase);
          setHandTarget(clk.h2, 'cum2', clk, phase + 180);
        });
      }, 90);
    }

    // Girandola: tutte le lancette ruotano insieme in senso orario, come
    // ventole sincronizzate (ispirato al "fun mode" dei replica-project).
    function startPinwheel() {
      runAnimation(() => {
        const t = animTick * 8;
        clocks.forEach((clk) => {
          setHandTarget(clk.h1, 'cum1', clk, t % 360);
          setHandTarget(clk.h2, 'cum2', clk, (t + 180) % 360);
        });
      }, 90);
    }

    // Increspatura: un'onda radiale che si propaga dal centro verso i bordi.
    function startRipple() {
      runAnimation(() => {
        const t = animTick * 10;
        const cx = (cfg.cols - 1) / 2, cy = (cfg.rows - 1) / 2;
        clocks.forEach((clk, idx) => {
          const r = Math.floor(idx / cfg.cols), c = idx % cfg.cols;
          const dist = Math.hypot(c - cx, r - cy);
          const phase = (t - dist * 26) % 360;
          setHandTarget(clk.h1, 'cum1', clk, phase);
          setHandTarget(clk.h2, 'cum2', clk, phase + 180);
        });
      }, 90);
    }

    function startLive() {
      runAnimation(() => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        showNumber(hh + mm);
      }, 1000);
    }

    function applyState(state) {
      if (!cfg || state.rows !== cfg.rows || state.cols !== cfg.cols) {
        build({ rows: state.rows || 3, cols: state.cols || 8 });
      }
      stopAnimation();
      if (state.mode === 'live') startLive();
      else if (state.mode === 'wave') startWave();
      else if (state.mode === 'pinwheel') startPinwheel();
      else if (state.mode === 'ripple') startRipple();
      else if (state.mode === 'custom') showNumber(state.customDigits || '');
      else if (state.mode === 'park') parkAll();
    }

    function fitToViewport() {
      container.style.transform = 'none';
      const rect = container.getBoundingClientRect();
      const parent = container.parentElement;
      const maxW = parent.clientWidth * 0.94;
      const maxH = parent.clientHeight * 0.94;
      const scale = Math.min(maxW / rect.width, maxH / rect.height, 1.6);
      container.style.transform = `scale(${scale})`;
    }

    window.addEventListener('resize', () => { if (cfg) fitToViewport(); });

    build(initialCfg);

    return { build, showNumber, parkAll, applyState, fitToViewport };
  }

  return { create };
})();
