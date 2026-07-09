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
          const h1 = document.createElement('div'); h1.className = 'hand';
          const h2 = document.createElement('div'); h2.className = 'hand';
          clockDiv.appendChild(h1); clockDiv.appendChild(h2);
          container.appendChild(clockDiv);
          clocks.push({ h1, h2, cum1: 225, cum2: 45 });
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

    function setCell(clk, a1, a2) {
      setHandTarget(clk.h1, 'cum1', clk, a1);
      setHandTarget(clk.h2, 'cum2', clk, a2);
    }

    function segActiveFor(digit, key) {
      const seg = ClockFont.SEG[digit];
      return !!(seg && seg[key]);
    }

    // Disegna una cifra su un blocco di `width` colonne che usa TUTTE le righe
    // della griglia. La colonna sinistra e quella destra portano i verticali
    // (F/B sopra la giunzione, E/C sotto) con angolo in alto/giunzione/angolo
    // in basso identici al font originale a 2 colonne; le righe in eccesso
    // diventano tratti dritti N-S cosi' i segmenti si allungano invece di
    // spezzarsi. Le colonne centrali (quando la cifra e' piu' larga di 2)
    // portano solo le tre barre orizzontali A/G/D, a riposo altrove.
    function renderDigitBlock(digit, colOffset, width) {
      const H = cfg.rows;

      // Riquadro 3x6: usa i glifi esatti trascritti dalle foto del prodotto.
      const glyph = ClockFont.GLYPHS_3x6[digit];
      if (width === 3 && H === 6 && glyph) {
        const [p1, p2] = ClockFont.PARK;
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 3; c++) {
            const clk = clocks[cellIndex(r, colOffset + c)];
            if (!clk) continue;
            const cell = glyph[r][c];
            if (cell) setCell(clk, cell[0], cell[1]);
            else setCell(clk, p1, p2);
          }
        }
        return;
      }

      const extra = Math.max(0, H - 3);
      const [topRun, bottomRun] = distribute(extra, 2);
      const midRow = 1 + topRun;
      const bottomRow = H - 1;
      const [park1, park2] = ClockFont.PARK;

      for (let c = 0; c < width; c++) {
        const absC = colOffset + c;
        const isEdge = c === 0 || c === width - 1;

        for (let r = 0; r < H; r++) {
          const clk = clocks[cellIndex(r, absC)];
          if (!clk) continue;
          let a1, a2;
          if (isEdge) {
            const localCol = c === 0 ? 0 : 1;
            const topSegKey = localCol === 0 ? 'F' : 'B';
            const bottomSegKey = localCol === 0 ? 'E' : 'C';
            if (r === 0) [a1, a2] = ClockFont.anglesForCell(digit, localCol);
            else if (r === midRow) [a1, a2] = ClockFont.anglesForCell(digit, 2 + localCol);
            else if (r === bottomRow) [a1, a2] = ClockFont.anglesForCell(digit, 4 + localCol);
            else if (r < midRow) {
              const active = segActiveFor(digit, topSegKey);
              [a1, a2] = active ? [ClockFont.N, ClockFont.S] : [park1, park2];
            } else {
              const active = segActiveFor(digit, bottomSegKey);
              [a1, a2] = active ? [ClockFont.N, ClockFont.S] : [park1, park2];
            }
          } else {
            let active = false;
            if (r === 0) active = segActiveFor(digit, 'A');
            else if (r === midRow) active = segActiveFor(digit, 'G');
            else if (r === bottomRow) active = segActiveFor(digit, 'D');
            [a1, a2] = active ? [ClockFont.E, ClockFont.W] : [park1, park2];
          }
          setCell(clk, a1, a2);
        }
      }
    }

    function parkColumnRange(fromCol, toCol) {
      const [park1, park2] = ClockFont.PARK;
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = fromCol; c < toCol; c++) {
          setCell(clocks[cellIndex(r, c)], park1, park2);
        }
      }
    }

    // La larghezza di una cifra si adatta a colonne/cifre (min. 2, l'unita'
    // minima del font a 7 segmenti): su una griglia piu' larga le cifre
    // diventano piu' larghe invece di lasciare colonne vuote, e lo spazio
    // che eventualmente avanza viene distribuito come spaziatura prima/tra/
    // dopo le cifre.
    function showNumber(str) {
      const s = String(str);
      const maxDigits = Math.max(1, Math.floor(cfg.cols / 2));
      const n = Math.max(1, Math.min(s.length, maxDigits));
      const digitW = Math.max(2, Math.floor(cfg.cols / n));
      const chars = s.slice(-n).padStart(n, ' ').split('');
      const leftover = cfg.cols - n * digitW;
      const gaps = distribute(leftover, n + 1);

      parkAll();
      let col = gaps[0];
      chars.forEach((ch, i) => {
        const d = /[0-9]/.test(ch) ? parseInt(ch, 10) : undefined;
        renderDigitBlock(d, col, digitW);
        col += digitW + gaps[i + 1];
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
          setCell(clk, phase, phase + 180);
        });
      }, 90);
    }

    // Girandola: tutte le lancette ruotano insieme in senso orario, come
    // ventole sincronizzate (ispirato al "fun mode" dei replica-project).
    function startPinwheel() {
      runAnimation(() => {
        const t = animTick * 8;
        clocks.forEach((clk) => {
          setCell(clk, t % 360, (t + 180) % 360);
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
          setCell(clk, phase, phase + 180);
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
